import type {Request} from 'express';
import {HEALTH_PATH} from '../constants/health-path.constant';

/** `/health` is the only unwrapped route, both on success and on failure (8.3). */
export function isHealthRequest(request: Pick<Request, 'path'>): boolean {
  return request.path.replace(/\/+$/, '') === HEALTH_PATH;
}
