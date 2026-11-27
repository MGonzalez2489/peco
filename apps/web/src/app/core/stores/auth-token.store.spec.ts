import {TestBed} from '@angular/core/testing';
import type {AuthResponse} from '@peco/contracts';
import {AuthTokenStore} from './auth-token.store';

const authResponse: AuthResponse = {
  user: {publicId: 'user-1'},
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresIn: 900,
  refreshExpiresIn: 3600,
} as unknown as AuthResponse;

describe('AuthTokenStore', () => {
  let store: InstanceType<typeof AuthTokenStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AuthTokenStore);
  });

  afterEach(() => store.clear());

  it('starts with an empty in-memory session', () => {
    expect(store.isAuthenticated()).toBe(false);
    expect(store.hasRefreshToken()).toBe(false);
  });

  it('stores both tokens and derives authentication state', () => {
    store.setTokens(authResponse);

    expect(store.accessToken()).toBe('access');
    expect(store.refreshToken()).toBe('refresh');
    expect(store.isAuthenticated()).toBe(true);
    expect(store.hasRefreshToken()).toBe(true);
  });

  it('clears every token', () => {
    store.setTokens(authResponse);
    store.clear();

    expect(store.accessToken()).toBeNull();
    expect(store.refreshToken()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });
});
