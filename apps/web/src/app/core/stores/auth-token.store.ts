import {computed} from '@angular/core';
import {patchState, signalStore, withComputed, withMethods, withState} from '@ngrx/signals';
import type {AuthResponse} from '@peco/contracts';
import {AuthTokenState} from '../models/auth-token-state.model';

const INITIAL_STATE: AuthTokenState = {
  accessToken: null,
  refreshToken: null,
  expiresIn: 0,
  refreshExpiresIn: 0,
};

/** Minimal in-memory token holder; Phase 1 will add persistence to the session service. */
export const AuthTokenStore = signalStore(
  {providedIn: 'root'},
  withState(INITIAL_STATE),
  withComputed(({accessToken, refreshToken}) => ({
    isAuthenticated: computed(() => !!accessToken()),
    hasRefreshToken: computed(() => !!refreshToken()),
  })),
  withMethods((store) => ({
    setTokens(auth: AuthResponse): void {
      patchState(store, {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
        expiresIn: auth.expiresIn,
        refreshExpiresIn: auth.refreshExpiresIn,
      });
    },
    clear(): void {
      patchState(store, INITIAL_STATE);
    },
  })),
);
