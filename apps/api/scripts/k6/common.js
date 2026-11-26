/* global __ENV */

import http from 'k6/http';
import {check} from 'k6';

/** Shared helpers for the API load scripts. All configuration comes from k6 env vars. */
export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const envNumber = (name, fallback) => {
  const value = Number(__ENV[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/** Logs in once per k6 setup so measured iterations never include argon2 cost. */
export const login = () => {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email: __ENV.EMAIL || 'load@example.com',
      password: __ENV.PASSWORD || 'correct-horse-battery',
    }),
    {
      headers: {'Content-Type': 'application/json'},
      tags: {endpoint: 'login'},
      timeout: '10s',
    },
  );

  check(response, {
    'login returns 200': (result) => result.status === 200,
    'login envelope has a token': (result) => Boolean(readEnvelope(result)?.data?.accessToken),
  });

  const token = readEnvelope(response)?.data?.accessToken;
  if (!token) {
    throw new Error('Login failed; set EMAIL and PASSWORD to a seeded API user');
  }

  return token;
};

export const readEnvelope = (response) => {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
};

/** Inclusive UTC month window ending in the current month. */
export const monthRange = (count) => {
  const end = new Date();
  const months = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - offset, 1));
    months.push(
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
    );
  }

  return {from: months[0], to: months[months.length - 1]};
};
