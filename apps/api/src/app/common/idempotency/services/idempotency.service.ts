import {Injectable} from '@nestjs/common';
import {unauthorizedException} from '../../../auth/utils/unauthorized.exception';
import {UtcClock} from '../../../database/clock/utc-clock';
import {ConfigService} from '../../../config/config.service';
import {UserProfileRepository} from '../../../users/services/user-profile.repository';
import {EnvelopeResult} from '../../http/envelope-result';
import {normalizeApiError} from '../../http/normalize-api-error.util';
import {IDEMPOTENCY_LIMITS} from '../constants/idempotency-limits.constant';
import {idempotencyKeyReusedException} from '../utils/idempotency-key-reused.exception';
import type {IdempotencyExecutionRequest} from '../types/idempotency-execution-request.type';
import type {IdempotencyOutcome} from '../types/idempotency-outcome.type';
import type {StoredIdempotencyBody} from '../types/stored-idempotency-body.type';
import {IdempotencyKeyRepository} from './idempotency-key.repository';

/**
 * Serializes mutations by `(userId, key)` and stores the pre-envelope result.
 * Stale pending rows (a crashed first attempt) are reused as fresh slots;
 * only successful and terminal 4xx outcomes are replayed (D19, D108).
 */
@Injectable()
export class IdempotencyService {
  constructor(
    private readonly repository: IdempotencyKeyRepository,
    private readonly users: UserProfileRepository,
    private readonly config: ConfigService,
    private readonly clock: UtcClock,
  ) {}

  async execute<T>(
    request: IdempotencyExecutionRequest,
    run: () => Promise<{statusCode: number; value: T}>,
  ): Promise<IdempotencyOutcome<T>> {
    const user = await this.users.findActiveByPublicId(request.userPublicId);
    if (!user) {
      throw unauthorizedException();
    }

    const ttlSeconds = this.config.config.operational.idempotencyTtlHours * 3600;
    const expiresAt = this.clock.plusSeconds(ttlSeconds);

    return this.repository.withLock(user.id, request.key, async (manager) => {
      const existing = await this.repository.findForUpdate(manager, user.id, request.key);

      if (
        existing !== null &&
        existing.expiresAt > this.clock.now() &&
        existing.responseStatus !== IDEMPOTENCY_LIMITS.pendingResponseStatus
      ) {
        if (
          existing.requestHash !== request.requestHash ||
          existing.endpoint !== request.endpoint
        ) {
          throw idempotencyKeyReusedException();
        }
        return this.replay<T>(
          existing.responseBody,
          existing.responseStatus,
          request.correlationId,
        );
      }

      const pending = await this.repository.savePending(manager, existing, {
        userId: user.id,
        key: request.key,
        endpoint: request.endpoint,
        requestHash: request.requestHash,
        expiresAt,
      });

      let handled: {statusCode: number; value: T};
      try {
        handled = await run();
      } catch (error: unknown) {
        const normalized = normalizeApiError(error);
        if (normalized.statusCode >= 500) {
          throw error;
        }

        const stored: StoredIdempotencyBody = {
          kind: 'error',
          statusCode: normalized.statusCode,
          code: normalized.code,
          message: normalized.message,
          details: normalized.details,
        };
        await this.repository.complete(manager, pending, normalized.statusCode, stored);
        return {kind: 'failure', exception: error} satisfies IdempotencyOutcome<T>;
      }

      // The global envelope interceptor may already have rendered the handler
      // result into `{data, meta?, error: null}`; persist only its payload so a
      // replay returns the same single envelope instead of nesting it twice.
      const rendered = this.renderedEnvelope(handled.value);
      const stored: StoredIdempotencyBody =
        handled.value instanceof EnvelopeResult
          ? {kind: 'success', data: handled.value.data, meta: handled.value.meta}
          : rendered !== null
            ? {kind: 'success', data: rendered.data, ...(rendered.meta ? {meta: rendered.meta} : {})}
            : {kind: 'success', data: handled.value ?? null};

      await this.repository.complete(manager, pending, handled.statusCode, stored);
      return {kind: 'success', value: handled.value} satisfies IdempotencyOutcome<T>;
    });
  }

  /** Recognizes the plain object emitted by `ResponseEnvelopeInterceptor`. */
  private renderedEnvelope(
    value: unknown,
  ): {data: unknown; meta?: Record<string, unknown>} | null {
    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const candidate = value as {data?: unknown; meta?: unknown; error?: unknown};
    if (!('data' in candidate) || !('error' in candidate) || candidate.error !== null) {
      return null;
    }

    return {
      data: candidate.data,
      ...(typeof candidate.meta === 'object' && candidate.meta !== null
        ? {meta: candidate.meta as Record<string, unknown>}
        : {}),
    };
  }

  private replay<T>(
    raw: Record<string, unknown> | null,
    statusCode: number,
    correlationId: string,
  ): IdempotencyOutcome<T> {
    const stored = (raw ?? {kind: 'success', data: null}) as StoredIdempotencyBody;

    if (stored.kind === 'error') {
      return {
        kind: 'replay',
        statusCode: stored.statusCode,
        body: {
          data: null,
          error: {
            statusCode: stored.statusCode,
            code: stored.code,
            message: stored.message,
            ...(stored.details === undefined ? {} : {details: stored.details}),
            correlationId,
          },
        },
      };
    }

    return {
      kind: 'replay',
      statusCode,
      body: {
        data: stored.data,
        ...(stored.meta ? {meta: {correlationId, ...stored.meta}} : {}),
        error: null,
      },
    };
  }
}
