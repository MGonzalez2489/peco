import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {SCHEDULED_TRANSACTION_TYPE_MAP} from '@core/constants';
import {CreateScheduledTransactionDto} from '@core/dtos/create-scheduled-transaction.dto';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {ScheduledTransactionTypeKey} from '@core/types';
import {UpcomingPaymentsWidgetComponent} from './upcoming-payments-widget.component';

const MAX_ITEMS = 5;

describe('UpcomingPaymentsWidgetComponent', () => {
  let scheduledStore: InstanceType<typeof ScheduledTransactionsStore>;
  let accountsStore: InstanceType<typeof AccountsStore>;

  const isoFromToday = (offsetDays: number): string => {
    const date = new Date(Date.now() + offsetDays * 86_400_000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const create = (overrides: Partial<CreateScheduledTransactionDto>): void => {
    scheduledStore.createScheduledTransaction({
      name: 'Pago',
      estimatedAmount: 100,
      type: SCHEDULED_TRANSACTION_TYPE_MAP[ScheduledTransactionTypeKey.EXPENSE],
      categoryId: 'services',
      sourceAccountId: accountsStore.accounts()[0].id,
      frequency: 'MONTHLY',
      interval: 1,
      nextExecutionDate: isoFromToday(1),
      autoApply: false,
      active: true,
      ...overrides,
    });
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UpcomingPaymentsWidgetComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        AccountsStore,
        CatalogStore,
        MovementsStore,
        ScheduledTransactionsStore,
      ],
    });

    scheduledStore = TestBed.inject(ScheduledTransactionsStore);
    accountsStore = TestBed.inject(AccountsStore);
  });

  it('limits the pending list to five items', () => {
    for (let index = 0; index < 7; index++) {
      create({name: `Pago ${index}`, nextExecutionDate: isoFromToday(-index - 1)});
    }

    const fixture = TestBed.createComponent(UpcomingPaymentsWidgetComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.upcoming().length).toBe(MAX_ITEMS);
  });

  it('prioritizes overdue schedules over upcoming ones', () => {
    create({name: 'Vencido A', nextExecutionDate: isoFromToday(-5)});
    create({name: 'Vencido B', nextExecutionDate: isoFromToday(-3)});
    for (let index = 0; index < 6; index++) {
      create({name: `Futuro ${index}`, nextExecutionDate: isoFromToday(index + 1)});
    }

    const fixture = TestBed.createComponent(UpcomingPaymentsWidgetComponent);
    fixture.detectChanges();

    const names = fixture.componentInstance.upcoming().map((schedule) => schedule.name);
    expect(names.length).toBe(MAX_ITEMS);
    expect(names[0]).toBe('Vencido A');
    expect(names[1]).toBe('Vencido B');
  });

  it('shows a link to manage the scheduled transactions', () => {
    const fixture = TestBed.createComponent(UpcomingPaymentsWidgetComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector('a[href="/scheduled"]');
    expect(link).not.toBeNull();
  });
});
