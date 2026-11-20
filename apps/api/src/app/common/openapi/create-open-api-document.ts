import type {INestApplication} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {CreateAccountRequestDto} from '../../accounts/dto/create-account-request.dto';
import {ListQueryDto} from '../dto/list-query.dto';

/** Builds the OpenAPI document from the same DTOs used by validation. */
export const createOpenApiDocument = (app: INestApplication) => {
  const documentConfig = new DocumentBuilder()
    .setTitle('Peco API')
    .setDescription(
      'API de Peco. Las respuestas correctas usan {data, meta} y los errores usan {error}.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  return SwaggerModule.createDocument(app, documentConfig, {
    extraModels: [ListQueryDto, CreateAccountRequestDto],
  });
};
