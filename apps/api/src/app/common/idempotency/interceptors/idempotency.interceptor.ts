import {CallHandler, ExecutionContext, Injectable, NestInterceptor} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {Response} from 'express';
import {Observable, from, lastValueFrom} from 'rxjs';
import {defaultIfEmpty} from 'rxjs/operators';
import {unauthorizedException} from '../../../auth/utils/unauthorized.exception';
import type {AuthenticatedRequest} from '../../types/authenticated-request.type';
import {IDEMPOTENCY_KEY_HEADER} from '../constants/idempotency-key-header.constant';
import {IDEMPOTENCY_LIMITS} from '../constants/idempotency-limits.constant';
import {IDEMPOTENCY_REPLAYED_HEADER} from '../constants/idempotency-replayed-header.constant';
import {REQUIRE_IDEMPOTENCY_KEY_METADATA_KEY} from '../constants/require-idempotency-key-metadata-key.constant';
import {IdempotencyService} from '../services/idempotency.service';
import {hashIdempotencyRequest} from '../utils/hash-idempotency-request.util';
import {validateIdempotencyKey} from '../utils/idempotency-key-validation.util';

/**
 * Runs before the response envelope so the raw handler result can be stored and
 * replayed with the current request's correlation id (8.5, D108).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly idempotency: IdempotencyService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return from(this.handle(context, next));
  }

  private async handle(context: ExecutionContext, next: CallHandler): Promise<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const publicId = request.auth?.publicId;
    if (!publicId) {
      throw unauthorizedException();
    }

    const required = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_IDEMPOTENCY_KEY_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const key = validateIdempotencyKey(request.header(IDEMPOTENCY_KEY_HEADER), required === true);
    if (!key) {
      return (await this.invoke(next, response)).value;
    }

    const endpoint =
      `${request.method} ${request.baseUrl}${request.route?.path ?? request.path}`.slice(
        0,
        IDEMPOTENCY_LIMITS.maxEndpointLength,
      );
    const requestHash = hashIdempotencyRequest({
      method: request.method,
      endpoint,
      params: request.params as Record<string, unknown>,
      query: request.query as Record<string, unknown>,
      body: request.body,
    });

    const outcome = await this.idempotency.execute(
      {
        userPublicId: publicId,
        key,
        endpoint,
        requestHash,
        correlationId: request.correlationId,
      },
      () => this.invoke(next, response),
    );

    if (outcome.kind === 'failure') {
      throw outcome.exception;
    }

    if (outcome.kind === 'replay') {
      response.status(outcome.statusCode);
      response.setHeader(IDEMPOTENCY_REPLAYED_HEADER, 'true');
      // A replay short-circuits the downstream envelope, so emit the final body.
      return outcome.body;
    }

    return outcome.value;
  }

  private async invoke(
    next: CallHandler,
    response: Response,
  ): Promise<{statusCode: number; value: unknown}> {
    const value = await lastValueFrom(next.handle().pipe(defaultIfEmpty(undefined)));

    return {statusCode: response.statusCode, value};
  }
}
