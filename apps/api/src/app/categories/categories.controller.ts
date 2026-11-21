import {Controller, Get, UseGuards} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {SkipThrottle, Throttle} from '@nestjs/throttler';
import {AuthRateLimitGuard} from '../auth/guards/auth-rate-limit.guard';
import {RATE_LIMITS} from '../common/constants/rate-limits.constant';
import {EnvelopeResult} from '../common/http/envelope-result';
import {CurrentUser} from '../common/security/decorators/current-user.decorator';
import {RateLimited} from '../common/security/decorators/rate-limited.decorator';
import {CategoriesService} from './categories.service';
import {CategoryResponseDto} from './dto/category-response.dto';

/** Authenticated catalog read: global system rows plus the caller's own rows (US-401). */
@ApiTags('categories')
@Controller('categories')
@UseGuards(AuthRateLimitGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @RateLimited()
  // The shared guard evaluates every named throttler; only the read policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, user: true})
  @Throttle({
    read: {limit: RATE_LIMITS.read.user.limit, ttl: RATE_LIMITS.read.user.ttl},
  })
  @ApiOperation({summary: 'Listar el catálogo global y las categorías del usuario autenticado'})
  @ApiOkResponse({
    description: 'Categorías en el envelope estándar {data, meta, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'array', items: {type: 'object'}},
        meta: {
          type: 'object',
          properties: {
            correlationId: {type: 'string'},
          },
        },
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de lecturas excedido.'})
  async list(
    @CurrentUser() publicId: string,
  ): Promise<EnvelopeResult<CategoryResponseDto[]>> {
    const items = await this.categories.list(publicId);

    return EnvelopeResult.withMeta(items, {});
  }
}
