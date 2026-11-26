import {Injectable, type OnModuleDestroy, type OnModuleInit} from '@nestjs/common';
import {EventEmitter} from 'node:events';
import {DataSource} from 'typeorm';
import {MetricsService} from './metrics.service';

/** Publishes live pool usage from the mysql2 connection pool events (13.2). */
@Injectable()
export class DatabasePoolMetricsService implements OnModuleInit, OnModuleDestroy {
  private pool?: EventEmitter;
  private inUse = 0;

  constructor(
    private readonly dataSource: DataSource,
    private readonly metrics: MetricsService,
  ) {}

  onModuleInit(): void {
    const pool = (this.dataSource.driver as unknown as {pool?: EventEmitter}).pool;
    if (!pool) {
      return;
    }
    this.pool = pool;
    this.metrics.setDbPoolInUse(0);
    pool.on('acquire', this.onAcquire);
    pool.on('release', this.onRelease);
  }

  onModuleDestroy(): void {
    if (!this.pool) {
      return;
    }
    this.pool.off('acquire', this.onAcquire);
    this.pool.off('release', this.onRelease);
  }

  private readonly onAcquire = (): void => {
    this.inUse += 1;
    this.metrics.setDbPoolInUse(this.inUse);
  };

  private readonly onRelease = (): void => {
    this.inUse = Math.max(0, this.inUse - 1);
    this.metrics.setDbPoolInUse(this.inUse);
  };
}
