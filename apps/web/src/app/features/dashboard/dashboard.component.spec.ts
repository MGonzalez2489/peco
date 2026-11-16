import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {GlobalPeriodStore} from '@core/stores/global-period.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
import {shiftPeriod} from '@core/utils';
import {DashboardComponent} from './dashboard.component';

describe('DashboardComponent', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        provideAppIcons(),
        AccountsStore,
        CatalogStore,
        MovementsStore,
        ScheduledTransactionsStore,
      ],
    });
  });

  it('renders the accounts block above the scheduled payments widget', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const accountsHeading = Array.from(compiled.querySelectorAll('h2')).find((heading) =>
      heading.textContent?.includes('Cuentas'),
    );
    const widget = compiled.querySelector('app-upcoming-payments-widget');

    expect(accountsHeading).not.toBeNull();
    expect(widget).not.toBeNull();

    const position = accountsHeading!.compareDocumentPosition(widget!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opens the read-only movement detail sheet when a recent movement is tapped', async () => {
    const movementsStore = TestBed.inject(MovementsStore);
    movementsStore.registerMovement({
      accountId: 'c-cash',
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 25000,
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[role="dialog"]')).toBeNull();

    const row = compiled.querySelector<HTMLElement>('app-movement-list [role="button"]');
    expect(row).not.toBeNull();
    row!.click();

    TestBed.flushEffects();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = compiled.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('250.00');
  });

  it('shows period movements as read-only when a closed period is selected', () => {
    const globalPeriodStore = TestBed.inject(GlobalPeriodStore);
    const movementsStore = TestBed.inject(MovementsStore);
    const previousKey = shiftPeriod(globalPeriodStore.selectedPeriodKey(), -1);
    const [year, month] = previousKey.split('-').map(Number);

    globalPeriodStore.setPeriod(year, month);
    movementsStore.registerMovement({
      accountId: 'c-cash',
      categoryId: 'services',
      type: 'EXPENSE',
      amount: 25000,
      date: new Date(year, month - 1, 15, 12).toISOString(),
    });

    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-movement-list [role="button"]')).not.toBeNull();
    expect(compiled.querySelector('button[aria-label^="Reversar movimiento"]')).toBeNull();
  });
});
