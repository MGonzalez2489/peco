import {randomUUID} from 'node:crypto';
import {IDEMPOTENCY_KEY_HEADER} from '../common/idempotency/constants/idempotency-key-header.constant';
import type {HttpApi} from './e2e-app';

/** Real auto-login session returned by `POST /auth/register` (8.6). */
export interface E2eSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly userPublicId: string;
  readonly email: string;
}

/** Registers a real user through HTTP and returns the auto-login session. */
export const registerE2eUser = async (http: HttpApi, label: string): Promise<E2eSession> => {
  const email = `${label}-${randomUUID()}@example.com`;
  const response = await http
    .post('/api/auth/register')
    .send({email, password: 'correct-horse-battery', name: 'Usuario E2E'})
    .expect(201);
  const data = response.body.data as {
    readonly user: {readonly publicId: string};
    readonly accessToken: string;
    readonly refreshToken: string;
  };

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userPublicId: data.user.publicId,
    email,
  };
};

/** Bearer headers for one authenticated Supertest request. */
export const authHeaders = (session: E2eSession): Record<string, string> => ({
  Authorization: `Bearer ${session.accessToken}`,
});

/** Stable, unique key for a mutation replay check (8.5/D108). */
export const nextIdempotencyKey = (label = 'e2e'): string =>
  `${label}-${randomUUID()}-${randomUUID()}`;

/** Sets a fresh idempotency key on a Supertest mutation. */
export const withIdempotency = <T extends {set(name: string, value: string): T}>(
  request: T,
  label?: string,
): T => request.set(IDEMPOTENCY_KEY_HEADER, nextIdempotencyKey(label));
