import { Pool } from 'pg';
import { ValidationRecord } from '../../../shared/types';
import { DatabasePool } from '../config';

export class ValidationRepository {
  private pool: Pool;

  constructor() {
    this.pool = DatabasePool.getInstance();
  }

  async create(record: ValidationRecord): Promise<void> {
    const query = `
      INSERT INTO validation_records (
        request_id, validator_type, namespace, identifier, 
        timestamp, metadata, fraud_score, is_emergency, validation_result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    const values = [
      record.requestId,
      record.validatorType,
      record.namespace,
      record.identifier,
      record.timestamp,
      JSON.stringify(record.metadata || {}),
      record.fraudScore || 0,
      record.isEmergency || false,
      JSON.stringify(record.validationResult)
    ];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      console.error('Error creating validation record:', error);
      throw error;
    }
  }

  async findByRequestId(requestId: string): Promise<ValidationRecord | null> {
    const query = `
      SELECT * FROM validation_records 
      WHERE request_id = $1
    `;

    try {
      const result = await this.pool.query(query, [requestId]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        requestId: row.request_id,
        validatorType: row.validator_type,
        namespace: row.namespace,
        identifier: row.identifier,
        timestamp: parseInt(row.timestamp),
        metadata: row.metadata,
        fraudScore: parseFloat(row.fraud_score),
        isEmergency: row.is_emergency,
        validationResult: row.validation_result
      };
    } catch (error) {
      console.error('Error finding validation record:', error);
      throw error;
    }
  }

  async findRecentByIdentifier(
    namespace: string, 
    identifier: string, 
    limit: number = 10
  ): Promise<ValidationRecord[]> {
    const query = `
      SELECT * FROM validation_records 
      WHERE namespace = $1 AND identifier = $2
      ORDER BY timestamp DESC
      LIMIT $3
    `;

    try {
      const result = await this.pool.query(query, [namespace, identifier, limit]);
      return result.rows.map(row => ({
        requestId: row.request_id,
        validatorType: row.validator_type,
        namespace: row.namespace,
        identifier: row.identifier,
        timestamp: parseInt(row.timestamp),
        metadata: row.metadata,
        fraudScore: parseFloat(row.fraud_score),
        isEmergency: row.is_emergency,
        validationResult: row.validation_result
      }));
    } catch (error) {
      console.error('Error finding recent validation records:', error);
      throw error;
    }
  }

  async getStats(timeRangeHours: number = 24): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_validations,
        AVG(fraud_score) as avg_fraud_score,
        COUNT(DISTINCT namespace) as unique_namespaces,
        COUNT(DISTINCT identifier) as unique_identifiers,
        SUM(CASE WHEN is_emergency THEN 1 ELSE 0 END) as emergency_access_count
      FROM validation_records
      WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '${timeRangeHours} hours'
    `;

    try {
      const result = await this.pool.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting validation stats:', error);
      throw error;
    }
  }
}