/* global __ENV */

import http from 'k6/http';
import {check, sleep} from 'k6';
import {Counter, Rate} from 'k6/metrics';
import {authHeaders, BASE_URL, envNumber, login} from './common.js';

const errors = new Rate('soak_errors');
const replays = new Counter('soak_replays');
const vus = envNumber('SOAK_VUS', 5);
const asOf = __ENV.AS_OF || new Date().toISOString().slice(0, 10);

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus,
      duration: __ENV.DURATION || '10m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:soak-jobs}': ['p(95)<500'],
    'http_req_failed{endpoint:soak-jobs}': ['rate<0.005'],
    soak_errors: ['rate<0.005'],
  },
};

export function setup() {
  return {token: login()};
}

export default function soak(data) {
  const url = `${BASE_URL}/api/scheduled-transactions/apply-due`;
  const response = http.post(
    url,
    JSON.stringify({asOf}),
    {
      headers: {
        ...authHeaders(data.token),
        // A stable key makes the repeated daily sweep a replay after the first write.
        'Idempotency-Key': `soak-apply-due-${asOf}`,
      },
      tags: {endpoint: 'soak-jobs'},
      timeout: '5s',
    },
  );

  const replayed =
    response.headers['Idempotency-Replayed'] === 'true' ||
    response.headers['idempotency-replayed'] === 'true';
  if (replayed) {
    replays.add(1);
  }

  const ok = check(response, {
    'apply-due returns 200 or 201': (result) => result.status === 200 || result.status === 201,
    'apply-due envelope is valid': (result) => {
      try {
        const envelope = JSON.parse(result.body);
        return envelope.error === null && typeof envelope.data?.applied === 'number';
      } catch {
        return false;
      }
    },
  });

  errors.add(!ok);
  sleep(2);
}
