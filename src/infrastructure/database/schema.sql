-- SSS-API Database Schema
-- Two-stage authentication system with cryptographic enforcement

-- Create database if not exists
-- CREATE DATABASE sss_api;

-- Use UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Validation records (Stage 1)
CREATE TABLE IF NOT EXISTS validation_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id VARCHAR(255) UNIQUE NOT NULL,
    validator_type VARCHAR(50) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    timestamp BIGINT NOT NULL,
    metadata JSONB,
    fraud_score DECIMAL(3,2) CHECK (fraud_score >= 0 AND fraud_score <= 1),
    is_emergency BOOLEAN DEFAULT FALSE,
    validation_result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_namespace_identifier ON validation_records (namespace, identifier);
CREATE INDEX idx_timestamp ON validation_records (timestamp);

-- Authentication tokens (Stage 1 output)
CREATE TABLE IF NOT EXISTS authentication_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_id VARCHAR(255) UNIQUE NOT NULL,
    validation_record_id UUID REFERENCES validation_records(id),
    token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    issued_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_hash ON authentication_tokens (token_hash);
CREATE INDEX idx_expires_at ON authentication_tokens (expires_at);

-- Consensus records (Stage 2)
CREATE TABLE IF NOT EXISTS consensus_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_id VARCHAR(255) UNIQUE NOT NULL,
    token_id VARCHAR(255) NOT NULL,
    namespace VARCHAR(100) NOT NULL,
    identifier VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    consensus_timestamp BIGINT NOT NULL,
    block_height BIGINT,
    merkle_root VARCHAR(64),
    consensus_nodes JSONB, -- Array of node signatures
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_namespace_identifier_consensus ON consensus_records (namespace, identifier);
CREATE INDEX idx_block_height ON consensus_records (block_height);

-- Merkle tree nodes (Stage 2 storage)
CREATE TABLE IF NOT EXISTS merkle_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id VARCHAR(255) NOT NULL,
    node_hash VARCHAR(64) NOT NULL,
    left_child VARCHAR(64),
    right_child VARCHAR(64),
    level INTEGER NOT NULL,
    position INTEGER NOT NULL,
    is_leaf BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tree_id, level, position)
);

CREATE INDEX idx_tree_id ON merkle_nodes (tree_id);
CREATE INDEX idx_node_hash ON merkle_nodes (node_hash);

-- Government service integrations
CREATE TABLE IF NOT EXISTS government_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(50) NOT NULL, -- NHS, HMRC, DVLA, etc.
    external_id VARCHAR(255) NOT NULL, -- NHS number, NI number, etc.
    consensus_record_id UUID REFERENCES consensus_records(id),
    service_data JSONB NOT NULL,
    last_verified TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verification_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (service_type, external_id)
);

CREATE INDEX idx_service_type ON government_records (service_type);
CREATE INDEX idx_last_verified ON government_records (last_verified);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    actor_id VARCHAR(255),
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(50) NOT NULL,
    result VARCHAR(50) NOT NULL,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_type ON audit_logs (event_type);
CREATE INDEX idx_actor_id ON audit_logs (actor_id);
CREATE INDEX idx_created_at ON audit_logs (created_at);

-- Performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL,
    stage VARCHAR(10) NOT NULL, -- stage1 or stage2
    operation VARCHAR(100) NOT NULL,
    latency_ms DECIMAL(10,3),
    throughput INTEGER,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_metric_type_timestamp ON performance_metrics (metric_type, timestamp);
CREATE INDEX idx_stage_operation ON performance_metrics (stage, operation);

-- Consensus nodes registry
CREATE TABLE IF NOT EXISTS consensus_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(255) UNIQUE NOT NULL,
    public_key VARCHAR(500) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    region VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_status ON consensus_nodes (status);
CREATE INDEX idx_last_heartbeat ON consensus_nodes (last_heartbeat);

-- Create update trigger for government_records
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_government_records_updated_at 
    BEFORE UPDATE ON government_records 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create partitioning for high-volume tables (optional, for scale)
-- Partition validation_records by month
-- CREATE TABLE validation_records_2024_01 PARTITION OF validation_records
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for common queries
-- Note: These are simple indexes without WHERE clauses for PostgreSQL compatibility
CREATE INDEX idx_validation_timestamp_range ON validation_records(timestamp);
CREATE INDEX idx_consensus_recent ON consensus_records(consensus_timestamp);

-- Views for monitoring
CREATE OR REPLACE VIEW authentication_stats AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    COUNT(*) as total_authentications,
    SUM(CASE WHEN fraud_score > 0.5 THEN 1 ELSE 0 END) as high_fraud_risk,
    AVG(fraud_score) as avg_fraud_score,
    COUNT(DISTINCT namespace) as unique_namespaces
FROM validation_records
WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

CREATE OR REPLACE VIEW system_health AS
SELECT 
    (SELECT COUNT(*) FROM consensus_nodes WHERE status = 'active') as active_nodes,
    (SELECT AVG(latency_ms) FROM performance_metrics 
     WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '5 minutes') as avg_latency_ms,
    (SELECT SUM(success_count) FROM performance_metrics 
     WHERE timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour') as hourly_success_count,
    (SELECT COUNT(*) FROM validation_records 
     WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute') as authentications_per_minute;