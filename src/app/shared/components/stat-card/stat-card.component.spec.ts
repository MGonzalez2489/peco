import {ComponentFixture, TestBed} from '@angular/core/testing';
import {StatCardComponent} from './stat-card.component';

describe('StatCardComponent', () => {
  let fixture: ComponentFixture<StatCardComponent>;

  const native = (): HTMLElement => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({imports: [StatCardComponent]});
    fixture = TestBed.createComponent(StatCardComponent);
    fixture.detectChanges();
  });

  it('shows a decreasing available-credit bar for credit accounts', () => {
    fixture.componentRef.setInput('title', 'Tarjeta de crédito');
    fixture.componentRef.setInput('amount', -2500);
    fixture.componentRef.setInput('creditLimit', 10000);
    fixture.detectChanges();

    const text = native().textContent ?? '';
    expect(text).toContain('Disponible');
    expect(text).toContain('75%');
    expect(text).not.toContain('Sin meta');
  });

  it('falls back to the savings goal when there is no credit limit', () => {
    fixture.componentRef.setInput('amount', 500);
    fixture.componentRef.setInput('goal', 1000);
    fixture.detectChanges();

    const text = native().textContent ?? '';
    expect(text).toContain('Meta');
    expect(text).toContain('50%');
  });

  it('shows the empty state when neither a goal nor a credit limit exists', () => {
    fixture.componentRef.setInput('amount', 100);
    fixture.detectChanges();

    expect(native().textContent).toContain('Sin meta');
  });
});
