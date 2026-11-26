import type {NextFunction, Request, Response} from 'express';

/** Baseline transport headers; TLS is terminated at the proxy (13.1). */
export const createSecurityHeaders =
  (production: boolean) =>
  (_request: Request, response: Response, next: NextFunction): void => {
    response.removeHeader('X-Powered-By');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (production) {
      response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  };
