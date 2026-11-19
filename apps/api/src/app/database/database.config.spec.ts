import {NamingStrategyInterface} from 'typeorm';
import {AppConfig} from '../config/app-config';
import {createTypeOrmOptions, TYPEORM_ENTITIES, TYPEORM_MIGRATIONS} from './database.config';
import {BaseEntitySubscriber} from './subscribers/base-entity.subscriber';

const DATABASE: AppConfig['database'] = {
  host: 'db.internal',
  port: 3307,
  user: 'peco',
  password: 'secret',
  name: 'peco_test',
  poolSize: 7,
  healthPingTimeoutMs: 1000,
};

type NamingStrategyContract = Pick<
  NamingStrategyInterface,
  'uniqueConstraintName' | 'indexName' | 'foreignKeyName'
>;

describe('createTypeOrmOptions', () => {
  const options = createTypeOrmOptions(DATABASE) as Record<string, unknown>;

  it('maps the validated database configuration', () => {
    expect(options['type']).toBe('mysql');
    expect(options['host']).toBe(DATABASE.host);
    expect(options['port']).toBe(DATABASE.port);
    expect(options['username']).toBe(DATABASE.user);
    expect(options['password']).toBe(DATABASE.password);
    expect(options['database']).toBe(DATABASE.name);
    expect(options['poolSize']).toBe(DATABASE.poolSize);
    expect(options['charset']).toBe('utf8mb4');
    expect(options['timezone']).toBe('Z');
    expect(options['dateStrings']).toBe(true);
  });

  it('keeps schema changes under reviewed migrations only', () => {
    expect(options['synchronize']).toBe(false);
    expect(options['migrationsRun']).toBe(false);
    expect(options['entities']).toBe(TYPEORM_ENTITIES);
    expect(options['migrations']).toBe(TYPEORM_MIGRATIONS);
    expect(TYPEORM_ENTITIES).toHaveLength(13);
    expect(TYPEORM_MIGRATIONS).toHaveLength(1);
    expect(options['subscribers']).toEqual([BaseEntitySubscriber]);
  });

  it('uses deterministic camelCase constraint names', () => {
    const namingStrategy = options['namingStrategy'] as NamingStrategyContract;

    expect(namingStrategy.uniqueConstraintName('users', ['email'])).toBe('UQUsersEmail');
    expect(namingStrategy.indexName('movements', ['userId', 'date'])).toBe(
      'IDXMovementsUserIdDate',
    );
    expect(namingStrategy.foreignKeyName('accounts', ['userId'])).toBe('FKAccountsUserId');
  });
});
