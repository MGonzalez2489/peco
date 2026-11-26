import {AlertRuleEnum, AlertSeverityEnum} from '@peco/enums';
import type {EntityManager} from 'typeorm';
import type {DataSource} from 'typeorm';
import {AlertService} from '../../common/observability/alert.service';
import {MetricsRegistry} from '../../common/observability/metrics-registry';
import {MetricsService} from '../../common/observability/metrics.service';
import type {AccountEntity} from '../../database/entities';
import {PeriodClosingRepository} from './period-closing.repository';

describe('snapshot chain alerts (US-1002)', () => {
  it('raises a PII-free alert and counts a chain mismatch', async () => {
    const alerts = new AlertService();
    const raise = jest.spyOn(alerts, 'raise').mockImplementation(() => undefined);
    const metrics = new MetricsService(new MetricsRegistry());
    const count = jest
      .spyOn(metrics, 'addSnapshotChainMismatch')
      .mockImplementation(() => undefined);
    const repository = new PeriodClosingRepository({} as DataSource, alerts, metrics);

    const manager = {
      findOne: jest.fn(async () => ({id: 10})),
      find: jest.fn(async () => [{accountId: 5, finalBalance: 100}]),
    } as unknown as EntityManager;
    const rows = [
      {account: {id: 5, publicId: 'must-not-be-logged'} as AccountEntity, openingBalance: 120},
    ];

    await (
      repository as unknown as {
        warnOnChainMismatch(
          manager: EntityManager,
          userId: number,
          period: string,
          rows: readonly {account: AccountEntity; openingBalance: number}[],
        ): Promise<void>;
      }
    ).warnOnChainMismatch(manager, 1, '2026-11', rows);

    expect(count).toHaveBeenCalledTimes(1);
    expect(raise).toHaveBeenCalledWith(
      AlertRuleEnum.SNAPSHOT_CHAIN_MISMATCH.toString(),
      AlertSeverityEnum.PAGE.toString(),
      {
        code: 'SNAPSHOT_CHAIN_MISMATCH',
        period: '2026-11',
        snapshotBalance: 100,
        ledgerBalance: 120,
      },
    );
  });
});
