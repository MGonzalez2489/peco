import {ExecutionContext, HttpStatus, Inject, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {
  getOptionsToken,
  getStorageToken,
  ThrottlerGuard,
  type ThrottlerLimitDetail,
  type ThrottlerModuleOptions,
  type ThrottlerStorage,
} from '@nestjs/throttler';
import {ApiErrorCodeEnum} from '@peco/enums';
import {createHash} from 'node:crypto';
import type {Response} from 'express';
import {API_ERROR_MESSAGES} from '../../common/http/api-error-messages.constant';
import {ApiException} from '../../common/http/api-exception';
import {RATE_LIMIT_METADATA_KEY} from '../../common/security/constants/rate-limit-metadata-key.constant';
import type {AuthenticatedRequest} from '../../common/types/authenticated-request.type';
import {normalizeEmail} from '../utils/normalize-email.util';

/**
 * Adapts `@nestjs/throttler` to the API contract (13.1, D86/D88): only routes
 * explicitly marked `@RateLimited()` are counted, identity buckets use a hash
 * of the normalized submitted email, user/read buckets use the authenticated
 * `publicId`, and rejections keep the error envelope.
 */
@Injectable()
export class AuthRateLimitGuard extends ThrottlerGuard {
  constructor(
    @Inject(getOptionsToken()) options: ThrottlerModuleOptions,
    @Inject(getStorageToken()) storage: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storage, reflector);
  }

  protected override async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const limited = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return limited !== true;
  }

  protected override generateKey(context: ExecutionContext, tracker: string, name: string): string {
    if (name === 'user' || name === 'read') {
      const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
      const publicIdHash = createHash('sha256')
        .update(request.auth?.publicId ?? '')
        .digest('hex');

      // Ignore the IP tracker so one user shares a bucket across devices.
      return super.generateKey(context, publicIdHash, name);
    }
    if (name !== 'identity') {
      return super.generateKey(context, tracker, name);
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const rawEmail = request.body?.email;
    const email = typeof rawEmail === 'string' ? rawEmail : '';
    const emailHash = createHash('sha256').update(normalizeEmail(email)).digest('hex');

    // Ignore the IP tracker so one email shares a single identity bucket.
    return `${super.generateKey(context, '', name)}-${emailHash}`;
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: ThrottlerLimitDetail,
  ): Promise<void> {
    // `@nestjs/throttler` reports `timeToBlockExpire` in seconds.
    const retryAfterSeconds = Math.max(1, Math.ceil(detail.timeToBlockExpire));
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Retry-After', String(retryAfterSeconds));

    throw new ApiException(
      HttpStatus.TOO_MANY_REQUESTS,
      ApiErrorCodeEnum.RATE_LIMITED.toString(),
      API_ERROR_MESSAGES.RATE_LIMITED,
      {retryAfterSeconds},
    );
  }
}
