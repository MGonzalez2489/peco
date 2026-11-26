import {TypeOrmModuleOptions} from '@nestjs/typeorm';
import {AppConfig} from '../config/app-config';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  AuditLogEntity,
  CategoryEntity,
  IdempotencyKeyEntity,
  JobLockEntity,
  MovementEntity,
  PasswordResetTokenEntity,
  PeriodSnapshotEntity,
  RefreshTokenEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
  UserPreferencesEntity,
} from './entities';
import {InitialSchema1794873600000, JobLocks1795564800000} from './migrations';
import {CamelCaseNamingStrategy} from './naming.strategy';
import {BaseEntitySubscriber} from './subscribers/base-entity.subscriber';

/** Explicit registrations work with the bundled API, unlike filesystem globs. */
export const TYPEORM_ENTITIES = [
  UserEntity,
  RefreshTokenEntity,
  PasswordResetTokenEntity,
  AccountEntity,
  CategoryEntity,
  ScheduledTransactionEntity,
  MovementEntity,
  ScheduledExecutionEntity,
  PeriodSnapshotEntity,
  AccountPeriodBalanceEntity,
  UserPreferencesEntity,
  AuditLogEntity,
  IdempotencyKeyEntity,
  JobLockEntity,
];
export const TYPEORM_MIGRATIONS = [InitialSchema1794873600000, JobLocks1795564800000];

export const createTypeOrmOptions = (database: AppConfig['database']): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: database.host,
  port: database.port,
  username: database.user,
  password: database.password,
  database: database.name,
  poolSize: database.poolSize,
  charset: 'utf8mb4',
  timezone: 'Z',
  dateStrings: true,
  synchronize: false,
  migrationsRun: false,
  namingStrategy: new CamelCaseNamingStrategy(),
  entities: TYPEORM_ENTITIES,
  migrations: TYPEORM_MIGRATIONS,
  subscribers: [BaseEntitySubscriber],
});
