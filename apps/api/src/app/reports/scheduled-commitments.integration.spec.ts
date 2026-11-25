import type {AccountType, MovementType, RecurrenceFrequency, ScheduledTransactionType} from '@peco/contracts';
import {
  AccountTypeEnum,
  CategoryApplyTypeEnum,
  MovementTypeEnum,
  RecurrenceFrequencyEnum,
  ScheduledExecutionStatusEnum,
  ScheduledTransactionTypeEnum,
} from '@peco/enums';
import {MySqlContainer, type StartedMySqlContainer} from '@testcontainers/mysql';
import {DataSource, type DataSourceOptions} from 'typeorm';
import {ApiException} from '../common/http/api-exception';
import {UtcClock} from '../database/clock/utc-clock';
import {createTypeOrmOptions} from '../database/database.config';
import {
  AccountEntity,
  CategoryEntity,
  MovementEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
} from '../database/entities';
import {AccountRepository} from '../accounts/services/account.repository';
import {UserProfileRepository} from '../users/services/user-profile.repository';
import {CategoryDistributionRepository} from './services/category-distribution.repository';
import {ScheduledCommitmentsRepository} from './services/scheduled-commitments.repository';
import {ScheduledCommitmentsService} from './services/scheduled-commitments.service';

jest.setTimeout(180_000);

const REGISTRATION = '2026-08-01T00:00:00.000Z';
const NOW = '2026-11-05T10:00:00.000Z';

interface CategorySeed {
  readonly name: string;
  readonly displayName: string;
  readonly color: string;
  readonly icon: string;
  readonly isRoot?: boolean;
  readonly owner?: UserEntity | null;
}

interface ScheduleSeed {
  readonly owner: UserEntity;
  readonly account: AccountEntity;
  readonly category: CategoryEntity;
  readonly name: string;
  readonly type: ScheduledTransactionType;
  readonly amount: number;
  readonly anchorDate: string;
  readonly nextContemplatedDate: string;
  readonly nextExecutionDate: string;
  readonly endDate?: string | null;
  readonly frequency?: RecurrenceFrequency;
}

describe('scheduled commitments (MySQL 8, US-805)', () => {
  let container: StartedMySqlContainer;
  let dataSource: DataSource;
  let service: ScheduledCommitmentsService;

  const seedUser = async (email: string): Promise<UserEntity> => {
    const users = dataSource.getRepository(UserEntity);
    const user = await users.save(
      users.create({
        email,
        passwordHash: 'integration-password-hash',
        name: 'Manuel',
        lastActiveAt: NOW,
        deletedAt: null,
      }),
    );
    await users.update({id: user.id}, {createdAt: REGISTRATION});
    return users.findOneByOrFail({id: user.id});
  };

  const seedAccount = async (
    user: UserEntity,
    name: string,
    type: AccountType,
  ): Promise<AccountEntity> => {
    const accounts = dataSource.getRepository(AccountEntity);
    const account = await accounts.save(
      accounts.create({
        userId: user.id,
        name,
        type,
        initialBalance: 400_000,
        currentBalance: 400_000,
        includeInTotal: true,
        targetGoal: null,
        creditLimit: null,
        color: '#10B981',
        icon: 'banknote',
        pinToHome: false,
        isRoot: false,
        note: null,
        version: 0,
        deletedAt: null,
      }),
    );
    await accounts.update({id: account.id}, {createdAt: REGISTRATION});
    return accounts.findOneByOrFail({id: account.id});
  };

  const seedCategory = async (seed: CategorySeed): Promise<CategoryEntity> => {
    const categories = dataSource.getRepository(CategoryEntity);
    return categories.save(
      categories.create({
        userId: seed.owner?.id ?? null,
        name: `${seed.name}-${Math.random().toString(36).slice(2, 10)}`,
        displayName: seed.displayName,
        color: seed.color,
        icon: seed.icon,
        applyType: CategoryApplyTypeEnum.BOTH.toString(),
        isRoot: seed.isRoot ?? false,
        isSystem: false,
        deletedAt: null,
      }),
    );
  };

  const seedSchedule = async (seed: ScheduleSeed): Promise<ScheduledTransactionEntity> =>
    dataSource.getRepository(ScheduledTransactionEntity).save(
      dataSource.getRepository(ScheduledTransactionEntity).create({
        userId: seed.owner.id,
        name: seed.name,
        estimatedAmount: seed.amount,
        type: seed.type,
        categoryId: seed.category.id,
        sourceAccountId: seed.account.id,
        destinationAccountId: null,
        frequency: seed.frequency ?? RecurrenceFrequencyEnum.MONTHLY.toString(),
        interval: 1,
        anchorDate: seed.anchorDate,
        nextContemplatedDate: seed.nextContemplatedDate,
        nextExecutionDate: seed.nextExecutionDate,
        autoApply: false,
        active: true,
        totalOccurrences: null,
        completedOccurrences: 0,
        endDate: seed.endDate ?? null,
        version: 0,
        deletedAt: null,
      }),
    );

  const seedApplied = async (
    schedule: ScheduledTransactionEntity,
    category: CategoryEntity,
    account: AccountEntity,
    type: MovementType,
    amount: number,
    date: string,
  ): Promise<void> => {
    const movements = dataSource.getRepository(MovementEntity);
    const movement = await movements.save(
      movements.create({
        userId: schedule.userId,
        accountId: account.id,
        targetAccountId: null,
        categoryId: category.id,
        type,
        amount,
        date,
        note: schedule.name,
        reversalId: null,
        replacesMovementId: null,
        isReversal: false,
        isReversed: false,
        isCanceled: false,
        scheduledTransactionId: schedule.id,
        version: 0,
        deletedAt: null,
      }),
    );
    await dataSource.getRepository(ScheduledExecutionEntity).save(
      dataSource.getRepository(ScheduledExecutionEntity).create({
        scheduledTransactionId: schedule.id,
        contemplatedDate: date.slice(0, 10),
        occurrenceDate: date.slice(0, 10),
        movementId: movement.id,
        status: ScheduledExecutionStatusEnum.APPLIED.toString(),
        reason: null,
        attempts: 0,
      }),
    );
  };

  const seedSkipped = async (
    schedule: ScheduledTransactionEntity,
    account: AccountEntity,
    date: string,
  ): Promise<void> => {
    const movements = dataSource.getRepository(MovementEntity);
    const movement = await movements.save(
      movements.create({
        userId: schedule.userId,
        accountId: account.id,
        targetAccountId: null,
        categoryId: schedule.categoryId,
        type: MovementTypeEnum.EXPENSE.toString(),
        amount: 999_999,
        date,
        note: schedule.name,
        reversalId: null,
        replacesMovementId: null,
        isReversal: false,
        isReversed: false,
        isCanceled: true,
        scheduledTransactionId: schedule.id,
        version: 0,
        deletedAt: null,
      }),
    );
    await dataSource.getRepository(ScheduledExecutionEntity).save(
      dataSource.getRepository(ScheduledExecutionEntity).create({
        scheduledTransactionId: schedule.id,
        contemplatedDate: date.slice(0, 10),
        occurrenceDate: date.slice(0, 10),
        movementId: movement.id,
        status: ScheduledExecutionStatusEnum.SKIPPED.toString(),
        reason: 'USER_CANCELLED',
        attempts: 0,
      }),
    );
  };

  beforeAll(async () => {
    container = await new MySqlContainer('mysql:8.4')
      .withDatabase('peco')
      .withUsername('peco')
      .withUserPassword('peco')
      .withRootPassword('root')
      .start();

    const options = createTypeOrmOptions({
      host: container.getHost(),
      port: container.getPort(),
      user: container.getUsername(),
      password: container.getUserPassword(),
      name: container.getDatabase(),
      poolSize: 10,
      healthPingTimeoutMs: 1_000,
    });
    dataSource = new DataSource(options as DataSourceOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();

    const clock = {now: () => NOW} as UtcClock;
    service = new ScheduledCommitmentsService(
      new UserProfileRepository(dataSource),
      new ScheduledCommitmentsRepository(dataSource),
      new CategoryDistributionRepository(dataSource),
      new AccountRepository(dataSource, clock),
      clock,
    );
  });

  beforeEach(async () => {
    const tables = dataSource.entityMetadatas.map(({tableName}) => `\`${tableName}\``);
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    try {
      await runner.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const table of tables) {
        await runner.query(`DELETE FROM ${table}`);
      }
      await runner.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await runner.release();
    }
  });

  afterAll(async () => {
    await dataSource?.destroy();
    await container?.stop();
  });

  it('sums applied executions and pending grid points, excluding canceled rows and transfers', async () => {
    const user = await seedUser('current@example.com');
    const other = await seedUser('other@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString());
    const otherCash = await seedAccount(other, 'Ajeno', AccountTypeEnum.CASH.toString());
    const root = await seedCategory({
      name: 'unknown',
      displayName: 'Otros',
      color: '#6B7280',
      icon: 'folder-open',
      isRoot: true,
    });
    const food = await seedCategory({
      name: 'food',
      displayName: 'Comida',
      color: '#F97316',
      icon: 'utensils',
      owner: user,
    });
    const services = await seedCategory({
      name: 'services',
      displayName: 'Servicios',
      color: '#F59E0B',
      icon: 'zap',
      owner: user,
    });
    const payroll = await seedCategory({
      name: 'payroll',
      displayName: 'Nómina',
      color: '#10B981',
      icon: 'banknote',
      owner: user,
    });
    const salary = await seedCategory({
      name: 'salary',
      displayName: 'Sueldo',
      color: '#22C55E',
      icon: 'wallet',
      owner: user,
    });

    const appliedExpense = await seedSchedule({
      owner: user,
      account: cash,
      category: food,
      name: 'Gasto aplicado',
      type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
      amount: 90_000,
      anchorDate: '2026-10-02',
      nextContemplatedDate: '2026-12-02',
      nextExecutionDate: '2026-12-02',
    });
    const appliedIncome = await seedSchedule({
      owner: user,
      account: cash,
      category: payroll,
      name: 'Ingreso aplicado',
      type: ScheduledTransactionTypeEnum.INCOME.toString() as ScheduledTransactionType,
      amount: 200_000,
      anchorDate: '2026-10-03',
      nextContemplatedDate: '2026-12-03',
      nextExecutionDate: '2026-12-03',
    });
    const pendingExpense = await seedSchedule({
      owner: user,
      account: cash,
      category: services,
      name: 'Servicios',
      type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
      amount: 50_000,
      anchorDate: '2026-11-10',
      nextContemplatedDate: '2026-11-10',
      nextExecutionDate: '2026-11-10',
      endDate: '2026-11-20',
      frequency: RecurrenceFrequencyEnum.WEEKLY.toString(),
    });
    await seedSchedule({
      owner: user,
      account: cash,
      category: salary,
      name: 'Sueldo',
      type: ScheduledTransactionTypeEnum.INCOME.toString() as ScheduledTransactionType,
      amount: 300_000,
      anchorDate: '2026-11-15',
      nextContemplatedDate: '2026-11-15',
      nextExecutionDate: '2026-11-15',
      endDate: '2026-11-15',
    });
    const transfer = await seedSchedule({
      owner: user,
      account: cash,
      category: food,
      name: 'Transferencia',
      type: ScheduledTransactionTypeEnum.TRANSFER.toString() as ScheduledTransactionType,
      amount: 999_999,
      anchorDate: '2026-11-12',
      nextContemplatedDate: '2026-11-12',
      nextExecutionDate: '2026-11-12',
    });

    await seedApplied(
      appliedExpense,
      food,
      cash,
      MovementTypeEnum.EXPENSE.toString(),
      90_000,
      '2026-11-02T00:00:00.000Z',
    );
    await seedApplied(
      appliedIncome,
      payroll,
      cash,
      MovementTypeEnum.INCOME.toString(),
      200_000,
      '2026-11-03T00:00:00.000Z',
    );
    await seedSkipped(
      appliedExpense,
      cash,
      '2026-11-04T00:00:00.000Z',
    );
    const foreign = await seedSchedule({
      owner: other,
      account: otherCash,
      category: food,
      name: 'Ajena',
      type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
      amount: 777_777,
      anchorDate: '2026-11-06',
      nextContemplatedDate: '2026-11-06',
      nextExecutionDate: '2026-11-06',
    });
    await seedApplied(
      foreign,
      food,
      otherCash,
      MovementTypeEnum.EXPENSE.toString(),
      777_777,
      '2026-11-06T00:00:00.000Z',
    );

    expect(root.publicId).toBeDefined();
    expect(pendingExpense.publicId).toBeDefined();
    expect(transfer.publicId).toBeDefined();

    const result = await service.find(user.publicId, '2026-11');

    expect(result).toEqual({
      period: '2026-11',
      monthlyIncome: 500_000,
      monthlyExpenses: 190_000,
      netProjectedImpact: 310_000,
      projectedAvailableBalance: 710_000,
      incomeCommitmentPercentage: 38,
      expenseDistribution: [
        {
          categoryPublicId: services.publicId,
          displayName: 'Servicios',
          color: '#F59E0B',
          icon: 'zap',
          amount: 100_000,
          percentage: 53,
        },
        {
          categoryPublicId: food.publicId,
          displayName: 'Comida',
          color: '#F97316',
          icon: 'utensils',
          amount: 90_000,
          percentage: 47,
        },
      ],
      incomeDistribution: [
        {
          categoryPublicId: salary.publicId,
          displayName: 'Sueldo',
          color: '#22C55E',
          icon: 'wallet',
          amount: 300_000,
          percentage: 60,
        },
        {
          categoryPublicId: payroll.publicId,
          displayName: 'Nómina',
          color: '#10B981',
          icon: 'banknote',
          amount: 200_000,
          percentage: 40,
        },
      ],
    });
  });

  it('counts only applied executions for a past period and projects future occurrences', async () => {
    const user = await seedUser('history@example.com');
    const cash = await seedAccount(user, 'Efectivo', AccountTypeEnum.CASH.toString());
    const root = await seedCategory({
      name: 'unknown',
      displayName: 'Otros',
      color: '#6B7280',
      icon: 'folder-open',
      isRoot: true,
    });
    const food = await seedCategory({
      name: 'food',
      displayName: 'Comida',
      color: '#F97316',
      icon: 'utensils',
      owner: user,
    });
    const services = await seedCategory({
      name: 'services',
      displayName: 'Servicios',
      color: '#F59E0B',
      icon: 'zap',
      owner: user,
    });

    const past = await seedSchedule({
      owner: user,
      account: cash,
      category: food,
      name: 'Pasado',
      type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
      amount: 120_000,
      anchorDate: '2026-10-05',
      nextContemplatedDate: '2026-12-05',
      nextExecutionDate: '2026-12-05',
    });
    await seedApplied(
      past,
      food,
      cash,
      MovementTypeEnum.EXPENSE.toString(),
      120_000,
      '2026-10-05T00:00:00.000Z',
    );
    await seedSchedule({
      owner: user,
      account: cash,
      category: services,
      name: 'Futuro',
      type: ScheduledTransactionTypeEnum.EXPENSE.toString() as ScheduledTransactionType,
      amount: 75_000,
      anchorDate: '2026-12-05',
      nextContemplatedDate: '2026-12-05',
      nextExecutionDate: '2026-12-05',
    });

    expect(root.publicId).toBeDefined();
    const pastResult = await service.find(user.publicId, '2026-10');
    expect(pastResult.monthlyExpenses).toBe(120_000);
    expect(pastResult.monthlyIncome).toBe(0);
    expect(pastResult.expenseDistribution).toMatchObject([
      {categoryPublicId: food.publicId, amount: 120_000, percentage: 100},
    ]);

    const futureResult = await service.find(user.publicId, '2026-12');
    expect(futureResult.monthlyExpenses).toBe(195_000);
    expect(futureResult.expenseDistribution).toMatchObject([
      {categoryPublicId: food.publicId, amount: 120_000},
      {categoryPublicId: services.publicId, amount: 75_000},
    ]);
  });

  it('answers 404 for an unknown or inactive user', async () => {
    await seedUser('owner@example.com');

    const error = await service
      .find('missing-public-id', '2026-11')
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiException);
    expect((error as ApiException).getStatus()).toBe(404);
    expect((error as ApiException).code).toBe('NOT_FOUND');
  });
});
