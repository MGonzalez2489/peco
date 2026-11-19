import {createParamDecorator, ExecutionContext, HttpStatus} from '@nestjs/common';
import {ApiErrorCodeEnum} from '@peco/enums';
import {API_ERROR_MESSAGES} from '../../http/api-error-messages.constant';
import {ApiException} from '../../http/api-exception';
import type {AuthenticatedRequest} from '../../types/authenticated-request.type';

/** Reads the principal injected by the global access guard (D86/D87). */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const publicId = request.auth?.publicId;
    if (!publicId) {
      throw new ApiException(
        HttpStatus.UNAUTHORIZED,
        ApiErrorCodeEnum.UNAUTHORIZED.toString(),
        API_ERROR_MESSAGES.UNAUTHORIZED,
      );
    }
    return publicId;
  },
);
