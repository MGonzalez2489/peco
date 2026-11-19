/**
 * Rate limits from 13.1, in milliseconds for `@nestjs/throttler` (D86/D88).
 * `identity` buckets key on the normalized submitted email; `user` buckets key
 * on the authenticated `publicId`.
 */
export const RATE_LIMITS = {
  login: {
    ip: {limit: 10, ttl: 15 * 60 * 1000},
    identity: {limit: 5, ttl: 15 * 60 * 1000},
  },
  register: {
    ip: {limit: 5, ttl: 60 * 60 * 1000},
    identity: {limit: 5, ttl: 60 * 60 * 1000},
  },
  forgotPassword: {
    ip: {limit: 10, ttl: 60 * 60 * 1000},
    identity: {limit: 3, ttl: 60 * 60 * 1000},
  },
  resetPassword: {
    ip: {limit: 5, ttl: 60 * 60 * 1000},
  },
  mutation: {
    user: {limit: 120, ttl: 60 * 1000},
  },
} as const;
