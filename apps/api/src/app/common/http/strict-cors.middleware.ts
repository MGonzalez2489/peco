import type {NextFunction, Request, Response} from 'express';
import {CORRELATION_ID_HEADER} from '../constants/correlation-id-header.constant';

const ALLOWED_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const ALLOWED_HEADERS = `Authorization,Content-Type,Idempotency-Key,${CORRELATION_ID_HEADER}`;

/** Reflects only configured origins; never emits `*` or `Access-Control-Allow-Credentials` (13.1). */
export const createStrictCors =
  (allowedOrigins: readonly string[]) =>
  (request: Request, response: Response, next: NextFunction): void => {
    const origin = request.header('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      next();
      return;
    }

    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    response.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    response.setHeader('Access-Control-Max-Age', '600');

    if (request.method === 'OPTIONS') {
      response.status(204).end();
      return;
    }
    next();
  };
