import {createParamDecorator, ExecutionContext} from '@nestjs/common';
import type {AuthenticatedRequest} from '../../types/authenticated-request.type';

/** Pre-touch activity timestamp captured by the access guard for the D58 grace window. */
export const PreviousLastActiveAt = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | null => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.auth?.previousLastActiveAt ?? null;
  },
);
