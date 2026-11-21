import {Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
import {CreateCategoryRequestDto} from './dto/create-category-request.dto';
import {UpdateCategoryRequestDto} from './dto/update-category-request.dto';

/** Authenticated catalog read plus owner-scoped category mutations (US-401/US-402). */
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Crear una categoría propia'})
  @ApiCreatedResponse({
    description: 'Categoría creada en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido; el nombre o el color no son válidos.'})
  @ApiConflictResponse({description: 'Ya existe una categoría activa con ese nombre.'})
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  create(
    @CurrentUser() publicId: string,
    @Body() request: CreateCategoryRequestDto,
  ): Promise<CategoryResponseDto> {
    return this.categories.create(publicId, request);
  }

  @Patch(':publicId')
  @RateLimited()
  // The shared guard evaluates every named throttler; only the user policy applies (13.1).
  @SkipThrottle({ip: true, identity: true, read: true})
  @Throttle({
    user: {limit: RATE_LIMITS.mutation.user.limit, ttl: RATE_LIMITS.mutation.user.ttl},
  })
  @ApiOperation({summary: 'Actualizar los metadatos de una categoría propia'})
  @ApiParam({name: 'publicId', description: 'Identificador público de la categoría.'})
  @ApiOkResponse({
    description: 'Categoría actualizada en el envelope estándar {data, error}.',
    schema: {
      type: 'object',
      properties: {
        data: {type: 'object'},
        error: {type: 'null', nullable: true, example: null},
      },
    },
  })
  @ApiBadRequestResponse({description: 'Cuerpo inválido; el nombre o el color no son válidos.'})
  @ApiNotFoundResponse({description: 'La categoría no existe o pertenece a otro usuario.'})
  @ApiConflictResponse({
    description: 'Nombre duplicado o categoría del sistema/raíz no editable.',
  })
  @ApiUnauthorizedResponse({description: 'Falta un token de acceso válido.'})
  @ApiTooManyRequestsResponse({description: 'Límite de mutaciones excedido.'})
  update(
    @CurrentUser() publicId: string,
    @Param('publicId') categoryPublicId: string,
    @Body() request: UpdateCategoryRequestDto,
  ): Promise<CategoryResponseDto> {
    return this.categories.update(publicId, categoryPublicId, request);
  }
}
