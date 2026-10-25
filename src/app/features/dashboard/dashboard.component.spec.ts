import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideAppIcons} from '@core/icons/app-icons.provider';
import {AccountsStore} from '@core/stores/accounts.store';
import {CatalogStore} from '@core/stores/catalog.store';
import {MovementsStore} from '@core/stores/movements.store';
import {ScheduledTransactionsStore} from '@core/stores/scheduled-transactions.store';
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
});
