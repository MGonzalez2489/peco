import {TestBed} from '@angular/core/testing';
import {UserPreferencesStore} from '@core/stores/user-preferences.store';
import {PrivacyCurrencyPipe} from './privacy-currency.pipe';

describe('PrivacyCurrencyPipe', () => {
  const hideBalance = vi.fn<() => boolean>(() => false);

  const createPipe = (): PrivacyCurrencyPipe => {
    TestBed.configureTestingModule({
      providers: [PrivacyCurrencyPipe, {provide: UserPreferencesStore, useValue: {hideBalance}}],
    });

    return TestBed.inject(PrivacyCurrencyPipe);
  };

  beforeEach(() => {
    hideBalance.mockReturnValue(false);
    TestBed.resetTestingModule();
  });

  it('formats integer cents as currency', () => {
    expect(createPipe().transform(15050)).toBe('$150.50');
  });

  it('formats negative cents as a debt', () => {
    expect(createPipe().transform(-150000)).toBe('-$1,500.00');
  });

  it('returns an empty string for empty values', () => {
    const pipe = createPipe();

    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
  });

  it('obscures the amount when the balance must stay hidden', () => {
    hideBalance.mockReturnValue(true);

    expect(createPipe().transform(15050)).toBe('--.--');
  });
});
