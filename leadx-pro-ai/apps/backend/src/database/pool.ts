import mysql, { Pool, PoolOptions, RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2/promise';
import { env } from '../config/environment';
import { logger } from '../utils/logger';

const poolConfig: PoolOptions = {
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  connectionLimit: env.DB_CONNECTION_LIMIT,
  queueLimit: env.DB_QUEUE_LIMIT,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  multipleStatements: false, // SQL injection prevention
  dateStrings: false,
  timezone: '+00:00',
  charset: 'utf8mb4',
};

class DatabasePool {
  private pool: Pool;
  private static instance: DatabasePool;

  private constructor() {
    this.pool = mysql.createPool(poolConfig);
    this.setupEventListeners();
  }

  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool();
    }
    return DatabasePool.instance;
  }

  private setupEventListeners(): void {
    this.pool.on('connection', () => {
      logger.debug('New database connection established');
    });

    this.pool.on('release', () => {
      logger.debug('Database connection released');
    });
  }

  /**
   * Execute a parameterized query (SELECT)
   */
  async query<T extends RowDataPacket[]>(
    sql: string,
    params?: any[],
  ): Promise<[T, FieldPacket[]]> {
    try {
      const result = await this.pool.query<T>(sql, params);
      return result;
    } catch (error) {
      logger.error('Database query error', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute a parameterized mutation (INSERT, UPDATE, DELETE)
   */
  async execute(
    sql: string,
    params?: any[],
  ): Promise<[ResultSetHeader, FieldPacket[]]> {
    try {
      const result = await this.pool.execute<ResultSetHeader>(sql, params);
      return result;
    } catch (error) {
      logger.error('Database execute error', { sql, params, error });
      throw error;
    }
  }

  /**
   * Execute multiple queries in a transaction
   */
  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      logger.error('Transaction failed, rolled back', { error });
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Batch insert with chunking for large datasets
   * @param ignoreDuplicates - If true, uses INSERT IGNORE to skip rows that
   *   violate UNIQUE constraints (e.g. duplicate email/website per job).
   */
  async batchInsert(
    table: string,
    columns: string[],
    rows: unknown[][],
    chunkSize = 500,
    ignoreDuplicates = false,
  ): Promise<number> {
    let totalInserted = 0;

    const insertKeyword = ignoreDuplicates ? 'INSERT IGNORE INTO' : 'INSERT INTO';

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const placeholders = chunk
        .map(() => `(${columns.map(() => '?').join(', ')})`)
        .join(', ');
      const flatValues = chunk.flat();

      const sql = `${insertKeyword} ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
      const [result] = await this.execute(sql, flatValues);
      totalInserted += result.affectedRows;
    }

    return totalInserted;
  }

  /**
   * Check database connectivity
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    const pool = this.pool.pool;
    return {
      // @ts-ignore - accessing internal pool stats
      totalConnections: pool?._allConnections?.length || 0,
      // @ts-ignore
      freeConnections: pool?._freeConnections?.length || 0,
      // @ts-ignore
      queuedRequests: pool?._connectionQueue?.length || 0,
    };
  }

  /**
   * Close the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    logger.info('Database pool closed');
  }
}

export const db = DatabasePool.getInstance();
