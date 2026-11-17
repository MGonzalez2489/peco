import {Injectable, OnModuleDestroy} from '@nestjs/common';
import mysql, {Pool} from 'mysql2/promise';
import {ConfigService} from '../config/config.service';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private pool?: Pool;

  constructor(private readonly configService: ConfigService) {}

  private getPool(): Pool {
    if (!this.pool) {
      const {database} = this.configService.config;
      this.pool = mysql.createPool({
        host: database.host,
        port: database.port,
        user: database.user,
        password: database.password,
        database: database.name,
        connectionLimit: 1,
        connectTimeout: database.healthPingTimeoutMs,
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
