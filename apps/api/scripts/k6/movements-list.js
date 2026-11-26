/* global __ENV */

import http from 'k6/http';
import {check, sleep} from 'k6';
import {Rate} from 'k6/metrics';
import {authHeaders, BASE_URL, envNumber, login, monthRange, readEnvelope} from './common.js';

const errors = new Rate('list_errors');
const vus = envNumber('LIST_VUS', 10);
const limit = envNumber('LIST_LIMIT', 20);

let cursor = null;
let seen = new Set();

export const options = {
  scenarios: {
    list: {
      executor: 'constant-vus',
      vus,
      duration: __ENV.DURATION || '2m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:movements-list}': ['p(95)<300'],
    'http_req_failed{endpoint:movements-list}': ['rate<0.005'],
    list_errors: ['rate<0.005'],
  },
};

export function setup() {
  return {token: login(), range: monthRange(24)};
}

export default function movementsList(data) {
  const query = `from=${data.range.from}&to=${data.range.to}&limit=${limit}`;
  const url = `${BASE_URL}/api/movements?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const response = http.get(url, {
    headers: authHeaders(data.token),
    tags: {endpoint: 'movements-list'},
    timeout: '5s',
  });

  const envelope = readEnvelope(response);
  const items = envelope?.data ?? [];
  const ok = check(response, {
    'list returns 200': (result) => result.status === 200,
    'list page is bounded': () => items.length <= limit,
    'list page has no repeated rows': () => {
      const repeated = items.some((item) => seen.has(item.publicId));
      items.forEach((item) => seen.add(item.publicId));
      return !repeated;
    },
  });

  errors.add(!ok);
  cursor = envelope?.meta?.nextCursor ?? null;
  if (cursor === null) {
    seen = new Set();
  }

  sleep(0.5);
}
