# SSS-API Backup & Disaster Recovery Plan

## Overview
This document outlines the backup and disaster recovery procedures for the SSS-API system.

## Backup Strategy

### 1. Data Classification
- **Critical Data**: Authentication tokens, user identities, permanent records
- **Important Data**: API logs, metrics, temporary cache
- **Transient Data**: Session data, rate limit counters

### 2. Backup Schedule

#### Real-time Replication
- **PostgreSQL**: Streaming replication to standby servers
- **Redis**: Redis Sentinel with automatic failover
- **Application State**: Distributed across Cloudflare edge nodes

#### Scheduled Backups
```yaml
Daily:
  - Database full backup: 02:00 UTC
  - Configuration backup: 03:00 UTC
  - Audit logs archive: 04:00 UTC

Weekly:
  - Complete system snapshot: Sunday 05:00 UTC
  - Offsite backup sync: Sunday 06:00 UTC

Monthly:
  - Archive to cold storage: 1st of month
  - Backup rotation (keep 12 months)
```

### 3. Backup Locations
- **Primary**: AWS S3 (eu-west-2)
- **Secondary**: Azure Blob Storage (UK South)
- **Tertiary**: Google Cloud Storage (europe-west2)
- **Cold Storage**: AWS Glacier

## Disaster Recovery Procedures

### Recovery Time Objectives (RTO)
- **Critical Services**: < 5 minutes
- **Core APIs**: < 15 minutes
- **Full System**: < 1 hour

### Recovery Point Objectives (RPO)
- **Authentication Data**: 0 (real-time replication)
- **Transaction Data**: < 1 minute
- **Metrics/Logs**: < 5 minutes

### Disaster Scenarios

#### 1. Single Node Failure
**Detection**: Automated health checks
**Response**: Automatic failover to healthy nodes
**Recovery Time**: < 30 seconds

```bash
# Automatic handled by Cloudflare Workers
# Manual verification:
curl -X GET https://sss-api-edge-production.nfc-trace.workers.dev/health
```

#### 2. Region Failure
**Detection**: Multi-region monitoring
**Response**: DNS failover to alternate region
**Recovery Time**: < 2 minutes

```bash
# Update DNS to point to backup region
./scripts/failover-region.sh eu-west-2 us-east-1
```

#### 3. Database Corruption
**Detection**: Integrity checks every hour
**Response**: Restore from latest backup
**Recovery Time**: < 15 minutes

```bash
# Restore database
./scripts/restore-database.sh --source=s3://sss-backups/daily/latest
```

#### 4. Complete System Failure
**Detection**: External monitoring services
**Response**: Full system restoration
**Recovery Time**: < 1 hour

```bash
# Full disaster recovery
./scripts/disaster-recovery.sh --scenario=complete --target=production
```

## Backup Scripts

### Database Backup Script
```bash
#!/bin/bash
# /scripts/backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
S3_BUCKET="s3://sss-backups/daily"

# Perform backup
pg_dump -h $DB_HOST -U $DB_USER -d sss_api | gzip > $BACKUP_DIR/sss_api_$TIMESTAMP.sql.gz

# Upload to S3
aws s3 cp $BACKUP_DIR/sss_api_$TIMESTAMP.sql.gz $S3_BUCKET/

# Verify backup
aws s3 ls $S3_BUCKET/sss_api_$TIMESTAMP.sql.gz

# Clean old local backups (keep 7 days)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### Configuration Backup
```bash
#!/bin/bash
# /scripts/backup-config.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="config_backup_$TIMESTAMP.tar.gz"

# Create backup
tar -czf /tmp/$BACKUP_FILE \
  ./src/config \
  ./deployment \
  ./nginx \
  ./.env.production \
  ./wrangler.toml

# Encrypt backup
gpg --encrypt --recipient backup@sss-api.gov.uk /tmp/$BACKUP_FILE

# Upload to multiple locations
aws s3 cp /tmp/$BACKUP_FILE.gpg s3://sss-backups/config/
az storage blob upload --container-name backups --name config/$BACKUP_FILE.gpg --file /tmp/$BACKUP_FILE.gpg
gsutil cp /tmp/$BACKUP_FILE.gpg gs://sss-backups/config/

# Cleanup
rm /tmp/$BACKUP_FILE*
```

## Testing Procedures

### Monthly Disaster Recovery Drills
1. **Failover Test**: Simulate region failure
2. **Restore Test**: Restore database to staging
3. **Complete Recovery**: Full system restoration test

### Validation Checklist
- [ ] All APIs responding correctly
- [ ] Authentication working
- [ ] Data integrity verified
- [ ] Performance within SLA
- [ ] Monitoring active
- [ ] Logs flowing

## Monitoring & Alerts

### Backup Monitoring
```yaml
alerts:
  - name: BackupFailed
    condition: backup_success == 0
    action: page_oncall

  - name: BackupDelayed
    condition: time_since_last_backup > 25h
    action: email_team

  - name: BackupSizeDrop
    condition: backup_size < previous_size * 0.9
    action: investigate
```

### Recovery Monitoring
- External health checks every 30s
- Multi-region latency monitoring
- Data consistency checks
- Replication lag monitoring

## Contact Information

### Escalation Path
1. **On-Call Engineer**: Via PagerDuty
2. **Team Lead**: +44 7XXX XXXXXX
3. **Infrastructure Manager**: +44 7XXX XXXXXX
4. **CTO**: +44 7XXX XXXXXX

### External Contacts
- **Cloudflare Support**: Enterprise priority line
- **AWS Support**: Business support plan
- **Security Team**: security@sss-api.gov.uk

## Compliance

This disaster recovery plan complies with:
- ISO 22301 (Business Continuity)
- UK Government Cloud First policy
- NCSC Cloud Security Principles
- GDPR Article 32 (Security of Processing)

Last Updated: 2025-07-03
Next Review: 2025-10-03