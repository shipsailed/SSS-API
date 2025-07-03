import { Pool } from 'pg';
import { AuthRecord } from '../../../shared/types';
import { DatabasePool } from '../config';

export class ConsensusRepository {
  private pool: Pool;

  constructor() {
    this.pool = DatabasePool.getInstance();
  }

  async create(record: AuthRecord, merkleRoot?: string, blockHeight?: number): Promise<void> {
    const query = `
      INSERT INTO consensus_records (
        record_id, token_id, namespace, identifier, 
        data, consensus_timestamp, merkle_root, block_height
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      record.id,
      record.tokenId,
      record.namespace,
      record.identifier,
      JSON.stringify(record.data),
      record.timestamp,
      merkleRoot || null,
      blockHeight || null
    ];

    try {
      await this.pool.query(query, values);
    } catch (error) {
      console.error('Error creating consensus record:', error);
      throw error;
    }
  }

  async findById(recordId: string): Promise<AuthRecord | null> {
    const query = `
      SELECT * FROM consensus_records 
      WHERE record_id = $1
    `;

    try {
      const result = await this.pool.query(query, [recordId]);
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.record_id,
        tokenId: row.token_id,
        namespace: row.namespace,
        identifier: row.identifier,
        data: row.data,
        timestamp: parseInt(row.consensus_timestamp)
      };
    } catch (error) {
      console.error('Error finding consensus record:', error);
      throw error;
    }
  }

  async findByIdentifier(
    namespace: string, 
    identifier: string
  ): Promise<AuthRecord[]> {
    const query = `
      SELECT * FROM consensus_records 
      WHERE namespace = $1 AND identifier = $2
      ORDER BY consensus_timestamp DESC
    `;

    try {
      const result = await this.pool.query(query, [namespace, identifier]);
      return result.rows.map(row => ({
        id: row.record_id,
        tokenId: row.token_id,
        namespace: row.namespace,
        identifier: row.identifier,
        data: row.data,
        timestamp: parseInt(row.consensus_timestamp)
      }));
    } catch (error) {
      console.error('Error finding consensus records:', error);
      throw error;
    }
  }

  async getLatestBlockHeight(): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(block_height), 0) as latest_height
      FROM consensus_records
    `;

    try {
      const result = await this.pool.query(query);
      return parseInt(result.rows[0].latest_height);
    } catch (error) {
      console.error('Error getting latest block height:', error);
      throw error;
    }
  }

  async getRecordsByBlockHeight(blockHeight: number): Promise<AuthRecord[]> {
    const query = `
      SELECT * FROM consensus_records 
      WHERE block_height = $1
      ORDER BY consensus_timestamp
    `;

    try {
      const result = await this.pool.query(query, [blockHeight]);
      return result.rows.map(row => ({
        id: row.record_id,
        tokenId: row.token_id,
        namespace: row.namespace,
        identifier: row.identifier,
        data: row.data,
        timestamp: parseInt(row.consensus_timestamp)
      }));
    } catch (error) {
      console.error('Error getting records by block height:', error);
      throw error;
    }
  }
}