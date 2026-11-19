import {CanActivate, ExecutionContext, Injectable} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import {PUBLIC_METADATA_KEY} from '../../common/security/constants/public-metadata-key.constant';
import type {AuthenticatedRequest} from '../../common/types/authenticated-request.type';
import {TokenService} from '../services/token-service';
import {UserActivityRepository} from '../services/user-activity.repository';
import {unauthorizedException} from '../utils/unauthorized.exception';

/** Global access-token guard: every non-`@Public()` route needs a bearer JWT (8.1, D86). */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly activity: UserActivityRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.bearerToken(request.headers.authorization);
    if (!token) {
      throw unauthorizedException();
    }

    const claims = await this.tokens.verifyAccessToken(token);
    await this.activity.touch(claims.sub);
    request.auth = {publicId: claims.sub};

    return true;
  }

  private bearerToken(header: string | undefined): string | null {
    if (!header) {
      return null;
    }

    const [scheme, value, ...extra] = header.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== 'bearer' || !value || extra.length > 0) {
      return null;
    }

    return value;
  }
}
