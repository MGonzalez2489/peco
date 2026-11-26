/* global __ENV */

import http from 'k6/http';
import {check, sleep} from 'k6';
import {Rate} from 'k6/metrics';
import {authHeaders, BASE_URL, envNumber, login, monthRange, readEnvelope} from './common.js';

const errors = new Rate('dashboard_errors');
const vus = envNumber('DASHBOARD_VUS', 10);

export const options = {
  scenarios: {
    dashboard: {
      executor: 'constant-vus',
      vus,
      duration: __ENV.DURATION || '2m',
      gracefulStop: '10s',
    },
  },
  thresholds: {
    'http_req_duration{endpoint:dashboard}': ['p(95)<500'],
    'http_req_failed{endpoint:dashboard}': ['rate<0.005'],
    dashboard_errors: ['rate<0.005'],
  },
};

export function setup() {
  return {token: login(), range: monthRange(12)};
}

export default function dashboard(data) {
  const url = `${BASE_URL}/api/reports/dashboard?from=${data.range.from}&to=${data.range.to}`;
  const response = http.get(url, {
    headers: authHeaders(data.token),
    tags: {endpoint: 'dashboard'},
    timeout: '5s',
  });

  const ok = check(response, {
    'dashboard returns 200': (result) => result.status === 200,
    'dashboard has balances': (result) => {
      const envelope = readEnvelope(result);
      return envelope?.error === null && typeof envelope?.data?.balances?.totalBalance === 'number';
    },
  });

  errors.add(!ok);
  sleep(1);
}
