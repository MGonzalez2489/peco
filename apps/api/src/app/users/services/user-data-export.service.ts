import {Injectable} from '@nestjs/common';
import type {UserDataExport} from '@peco/contracts';
import type {Readable} from 'node:stream';
import {EnvelopeStream} from '../../common/http/envelope-stream';
import {UtcClock} from '../../database/clock/utc-clock';
import {
  AccountEntity,
  AccountPeriodBalanceEntity,
  CategoryEntity,
  MovementEntity,
  PeriodSnapshotEntity,
  ScheduledExecutionEntity,
  ScheduledTransactionEntity,
  UserEntity,
  UserPreferencesEntity,
} from '../../database/entities';
import {DEFAULT_USER_DATA_EXPORT_PREFERENCES} from '../constants/default-user-data-export-preferences.constant';
import {USER_DATA_EXPORT_SCHEMA_VERSION} from '../constants/user-data-export-schema-version.constant';
import {userNotFoundException} from '../utils/user-not-found.exception';
import {UserDataExportRepository} from './user-data-export.repository';
import {UserProfileRepository} from './user-profile.repository';

type AccountBalancesBySnapshot = Map<string, AccountPeriodBalanceEntity[]>;

type AccountBalance = UserDataExport['periodSnapshots'][number]['accountBalances'][number];

/** Internal ids of owned rows mapped to the public ids used on the wire. */
interface ExportPublicIds {
  accounts: Map<number, string>;
  categories: Map<number, string>;
  movements: Map<number, string>;
  scheduledTransactions: Map<number, string>;
}

/**
 * Assembles D73's single document one JSON chunk at a time. User lookup and
 * defaults are resolved before streaming so domain errors keep the normal
 * error envelope.
 */
@Injectable()
export class UserDataExportService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly repository: UserDataExportRepository,
    private readonly clock: UtcClock,
  ) {}

  async exportData(publicId: string, correlationId: string): Promise<EnvelopeStream> {
    const user = await this.profile.findActiveByPublicId(publicId);
    if (!user) {
      throw userNotFoundException();
    }

    const preferences = await this.repository.findPreferences(user.id);
    const [accountBalances, publicIds] = await Promise.all([
      this.repository.findAccountBalancesBySnapshot(user.id),
      this.loadPublicIds(user.id),
    ]);

    return new EnvelopeStream(
      this.streamDocument(user, preferences, accountBalances, publicIds, correlationId),
    );
  }

  private async loadPublicIds(userId: number): Promise<ExportPublicIds> {
    const [accounts, categories, movements, scheduledTransactions] = await Promise.all([
      this.repository.findAccountPublicIds(userId),
      this.repository.findCategoryPublicIds(userId),
      this.repository.findMovementPublicIds(userId),
      this.repository.findScheduledTransactionPublicIds(userId),
    ]);

    return {accounts, categories, movements, scheduledTransactions};
  }

  private async *streamDocument(
    user: UserEntity,
    preferences: UserPreferencesEntity | null,
    accountBalances: AccountBalancesBySnapshot,
    publicIds: ExportPublicIds,
    correlationId: string,
  ): AsyncGenerator<string> {
    yield `{"data":{"exportedAt":${JSON.stringify(this.clock.now())},"schemaVersion":${USER_DATA_EXPORT_SCHEMA_VERSION},"user":${JSON.stringify(this.mapUser(user))},"preferences":${JSON.stringify(this.mapPreferences(preferences))},`;

    yield* this.streamCollection(
      'accounts',
      await this.repository.streamAccounts(user.id),
      (row: AccountEntity) => this.mapAccount(row),
    );
    yield ',';
    yield* this.streamCollection(
      'categories',
      await this.repository.streamCategories(user.id),
      (row: CategoryEntity) => this.mapCategory(row),
    );
    yield ',';
    yield* this.streamCollection(
      'movements',
      await this.repository.streamMovements(user.id),
      (row: MovementEntity) => this.mapMovement(row, publicIds),
    );
    yield ',';
    yield* this.streamCollection(
      'scheduledTransactions',
      await this.repository.streamScheduledTransactions(user.id),
      (row: ScheduledTransactionEntity) => this.mapScheduledTransaction(row, publicIds),
    );
    yield ',';
    yield* this.streamCollection(
      'scheduledExecutions',
      await this.repository.streamScheduledExecutions(user.id),
      (row: ScheduledExecutionEntity) => this.mapScheduledExecution(row, publicIds),
    );
    yield ',';
    yield* this.streamCollection(
      'periodSnapshots',
      await this.repository.streamPeriodSnapshots(user.id),
      (row: PeriodSnapshotEntity) => this.mapPeriodSnapshot(row, accountBalances, publicIds),
    );
    yield `},"meta":{"correlationId":${JSON.stringify(correlationId)}}}\n`;
  }

  private async *streamCollection<T>(
    key: string,
    source: Readable,
    map: (row: T) => object,
  ): AsyncGenerator<string> {
    yield `"${key}":[`;
    let first = true;

    for await (const row of this.rows<T>(source)) {
      yield `${first ? '' : ','}${JSON.stringify(map(row))}`;
      first = false;
    }

    yield ']';
  }

  private async *rows<T>(source: Readable): AsyncGenerator<T> {
    for await (const row of source) {
      yield row as T;
    }
  }

  private requirePublicId(map: Map<number, string>, id: number): string {
    const publicId = map.get(id);
    if (!publicId) {
      throw new Error(`Missing public id for owned row ${id}`);
    }
    return publicId;
  }

  private optionalPublicId(map: Map<number, string>, id: number | null): string | null {
    return id === null ? null : this.requirePublicId(map, id);
  }

  private mapUser(user: UserEntity): UserDataExport['user'] {
    return {
      publicId: user.publicId,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  private mapPreferences(value: UserPreferencesEntity | null): UserDataExport['preferences'] {
    if (!value) {
      return {...DEFAULT_USER_DATA_EXPORT_PREFERENCES};
    }

    return {
      theme: value.theme,
      pwaBannerDismissedAt: value.pwaBannerDismissedAt,
      accounts: {hideBalance: value.hideBalance},
      movements: {hideReversal: value.hideReversal},
      updatedAt: value.updatedAt,
    };
  }

  private mapAccount(account: AccountEntity): UserDataExport['accounts'][number] {
    return {
      publicId: account.publicId,
      name: account.name,
      type: account.type,
      initialBalance: account.initialBalance,
      currentBalance: account.currentBalance,
      includeInTotal: account.includeInTotal,
      targetGoal: account.targetGoal,
      creditLimit: account.creditLimit,
      color: account.color,
      icon: account.icon,
      pinToHome: account.pinToHome,
      isRoot: account.isRoot,
      note: account.note,
      version: account.version,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      deletedAt: account.deletedAt,
    };
  }

  private mapCategory(category: CategoryEntity): UserDataExport['categories'][number] {
    return {
      publicId: category.publicId,
      name: category.name,
      displayName: category.displayName,
      icon: category.icon,
      color: category.color,
      applyType: category.applyType,
      isRoot: category.isRoot,
      isSystem: category.isSystem,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
    };
  }

  private mapMovement(
    movement: MovementEntity,
    publicIds: ExportPublicIds,
  ): UserDataExport['movements'][number] {
    return {
      publicId: movement.publicId,
      type: movement.type,
      amount: movement.amount,
      date: movement.date,
      note: movement.note,
      accountPublicId: this.requirePublicId(publicIds.accounts, movement.accountId),
      targetAccountPublicId: this.optionalPublicId(publicIds.accounts, movement.targetAccountId),
      categoryPublicId: this.requirePublicId(publicIds.categories, movement.categoryId),
      reversalOfPublicId: this.optionalPublicId(publicIds.movements, movement.reversalId),
      replacesPublicId: this.optionalPublicId(publicIds.movements, movement.replacesMovementId),
      isReversal: movement.isReversal,
      isReversed: movement.isReversed,
      isCanceled: movement.isCanceled,
      scheduledTransactionPublicId: this.optionalPublicId(
        publicIds.scheduledTransactions,
        movement.scheduledTransactionId,
      ),
      version: movement.version,
      createdAt: movement.createdAt,
      updatedAt: movement.updatedAt,
      deletedAt: movement.deletedAt,
    };
  }

  private mapScheduledTransaction(
    schedule: ScheduledTransactionEntity,
    publicIds: ExportPublicIds,
  ): UserDataExport['scheduledTransactions'][number] {
    return {
      publicId: schedule.publicId,
      name: schedule.name,
      estimatedAmount: schedule.estimatedAmount,
      type: schedule.type,
      categoryPublicId: this.requirePublicId(publicIds.categories, schedule.categoryId),
      sourceAccountPublicId: this.requirePublicId(publicIds.accounts, schedule.sourceAccountId),
      destinationAccountPublicId: this.optionalPublicId(
        publicIds.accounts,
        schedule.destinationAccountId,
      ),
      frequency: schedule.frequency,
      interval: schedule.interval,
      anchorDate: schedule.anchorDate,
      nextContemplatedDate: schedule.nextContemplatedDate,
      nextExecutionDate: schedule.nextExecutionDate,
      autoApply: schedule.autoApply,
      active: schedule.active,
      totalOccurrences: schedule.totalOccurrences,
      completedOccurrences: schedule.completedOccurrences,
      endDate: schedule.endDate,
      version: schedule.version,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
      deletedAt: schedule.deletedAt,
    };
  }

  private mapScheduledExecution(
    execution: ScheduledExecutionEntity,
    publicIds: ExportPublicIds,
  ): UserDataExport['scheduledExecutions'][number] {
    return {
      publicId: execution.publicId,
      scheduledTransactionPublicId: this.requirePublicId(
        publicIds.scheduledTransactions,
        execution.scheduledTransactionId,
      ),
      contemplatedDate: execution.contemplatedDate,
      occurrenceDate: execution.occurrenceDate,
      movementPublicId: this.optionalPublicId(publicIds.movements, execution.movementId),
      status: execution.status,
      reason: execution.reason,
      attempts: execution.attempts,
      createdAt: execution.createdAt,
    };
  }

  private mapPeriodSnapshot(
    snapshot: PeriodSnapshotEntity,
    accountBalances: AccountBalancesBySnapshot,
    publicIds: ExportPublicIds,
  ): UserDataExport['periodSnapshots'][number] {
    const balances = accountBalances.get(snapshot.publicId) ?? [];

    return {
      publicId: snapshot.publicId,
      period: snapshot.period,
      startDate: snapshot.startDate,
      endDate: snapshot.endDate,
      globalInitialBalance: snapshot.globalInitialBalance,
      globalFinalBalance: snapshot.globalFinalBalance,
      totalInflows: snapshot.totalInflows,
      totalOutflows: snapshot.totalOutflows,
      totalTransfers: snapshot.totalTransfers,
      totalTransactionsCount: snapshot.totalTransactionsCount,
      closedAt: snapshot.createdAt,
      accountBalances: balances.map((balance) => this.mapAccountBalance(balance, publicIds)),
    };
  }

  private mapAccountBalance(
    balance: AccountPeriodBalanceEntity,
    publicIds: ExportPublicIds,
  ): AccountBalance {
    return {
      accountPublicId: this.requirePublicId(publicIds.accounts, balance.accountId),
      accountName: balance.accountName,
      accountType: balance.accountType,
      color: balance.color,
      icon: balance.icon,
      includeInTotal: balance.includeInTotal,
      initialBalance: balance.initialBalance,
      finalBalance: balance.finalBalance,
      totalTransactions: balance.totalTransactions,
      totalInflows: balance.totalInflows,
      totalOutflows: balance.totalOutflows,
      totalTransfers: balance.totalTransfers,
    };
  }
}
