import {TestBed} from '@angular/core/testing';
import {SCHEDULED_TRANSACTION_TYPE_MAP} from '@core/constants';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {ScheduledTransaction} from '@core/models';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {ScheduledTransactionTypeKey} from '@core/types';
import {ScheduledTransactionCardComponent} from './scheduled-transaction-card.component';

const isoFromToday = (offsetDays: number): string => {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('ScheduledTransactionCardComponent', () => {
  const schedule = (nextExecutionDate: string): ScheduledTransaction => ({
    id: 'sched-1',
    name: 'Alquiler',
    estimatedAmount: 500,
    type: SCHEDULED_TRANSACTION_TYPE_MAP[ScheduledTransactionTypeKey.EXPENSE],
    categoryId: 'services',
    sourceAccountId: 'c-cash',
    frequency: 'MONTHLY',
    interval: 1,
    nextExecutionDate,
    autoApply: false,
    active: true,
    completedOccurrences: 0,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
  });

  const render = async (nextExecutionDate: string): Promise<HTMLElement> => {
    const fixture = TestBed.createComponent(ScheduledTransactionCardComponent);
    fixture.componentRef.setInput('schedule', schedule(nextExecutionDate));
    fixture.detectChanges();
    await fixture.whenStable();

    const header = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-expanded]',
    );
    header?.click();
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const buttonByText = (element: HTMLElement, text: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(text),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ScheduledTransactionCardComponent],
      providers: [
        provideAppIcons(),
        AccountsStore,
        CatalogStore,
        MovementsStore,
        ScheduledTransactionsStore,
      ],
    });
  });

  it('disables Apply and Skip while the next execution date is in the future', async () => {
    const element = await render(isoFromToday(5));

    const apply = buttonByText(element, 'Aplicar');
    const skip = buttonByText(element, 'Omitir');

    expect(apply?.disabled).toBe(true);
    expect(skip?.disabled).toBe(true);
  });

  it('enables Apply and Skip once the next execution date is due', async () => {
    const element = await render(isoFromToday(-1));

    const apply = buttonByText(element, 'Aplicar');
    const skip = buttonByText(element, 'Omitir');

    expect(apply?.disabled).toBe(false);
    expect(skip?.disabled).toBe(false);
  });
});
