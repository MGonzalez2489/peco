import {toIconName} from './to-icon-name.util';

describe('toIconName', () => {
  it('keeps names registered in the icon provider', () => {
    expect(toIconName('wallet', 'home')).toBe('wallet');
    expect(toIconName('arrow-up-right', 'home')).toBe('arrow-up-right');
    expect(toIconName('trash-2', 'home')).toBe('trash-2');
    expect(toIconName('bar-chart-3', 'home')).toBe('bar-chart-3');
  });

  it('falls back when the name is empty or unknown', () => {
    expect(toIconName(undefined, 'wallet')).toBe('wallet');
    expect(toIconName('', 'wallet')).toBe('wallet');
    expect(toIconName('legacy-coin', 'wallet')).toBe('wallet');
  });
});
