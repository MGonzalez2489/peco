import {Injectable, OnModuleDestroy} from '@nestjs/common';
import mysql, {Pool} from 'mysql2/promise';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private pool?: Pool;

  private getPool(): Pool {
    if (!this.pool) {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'peco',
        password: process.env.DB_PASSWORD || 'peco',
        database: process.env.DB_NAME || 'peco',
        connectionLimit: 1,
        connectTimeout: 2000,
      });
    }

    return this.pool;
  }

  async pingDatabase(): Promise<void> {
    const connection = await this.getPool().getConnection();
    try {
      await connection.ping();
    } finally {
      connection.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
  }
}
