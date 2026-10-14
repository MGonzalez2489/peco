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
});
