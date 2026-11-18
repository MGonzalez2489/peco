import {Controller, Get, Query, RequestMethod} from '@nestjs/common';
import type {INestApplication} from '@nestjs/common';
import {METHOD_METADATA, PATH_METADATA} from '@nestjs/common/constants';
import {ModulesContainer} from '@nestjs/core';
import {Test} from '@nestjs/testing';
import type {OpenAPIObject} from '@nestjs/swagger';
import request from 'supertest';
import {HealthController} from '../../health/health.controller';
import {HealthService} from '../../health/health.service';
import {HEALTH_PATH} from '../constants/health-path.constant';
import {ListQueryDto} from '../dto/list-query.dto';
import {configureOpenApi} from './configure-open-api';
import {createOpenApiDocument} from './create-open-api-document';

@Controller('doc-test')
class DocumentedController {
  @Get('single')
  single(): {id: string} {
    return {id: 'resource-1'};
  }

  @Get('list')
  list(@Query() query: ListQueryDto): ListQueryDto {
    return query;
  }
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

const joinPath = (...parts: readonly (string | undefined)[]): string =>
  `/${parts
    .filter((part): part is string => !!part)
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter((part) => part.length > 0)
    .join('/')}`;

const implementedRoutes = (app: INestApplication): string[] => {
  const routes: string[] = [];
  const modules = app.get(ModulesContainer);

  for (const moduleRef of modules.values()) {
    for (const controller of moduleRef.controllers.values()) {
      const metatype = controller.metatype;
      if (!metatype) {
        continue;
      }

      const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype) as string | undefined;
      const prototype = metatype.prototype as Record<string, unknown>;

      for (const methodName of Object.getOwnPropertyNames(prototype)) {
        if (methodName === 'constructor') {
          continue;
        }

        const handler = prototype[methodName];
        if (typeof handler !== 'function') {
          continue;
        }

        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as
          RequestMethod | undefined;
        if (requestMethod === undefined) {
          continue;
        }

        const methodPath = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
        const path = joinPath(controllerPath, methodPath);
        const fullPath = path === HEALTH_PATH ? path : joinPath('api', path);

        routes.push(`${RequestMethod[requestMethod].toUpperCase()} ${fullPath}`);
      }
    }
  }

  return routes;
};

const documentedRoutes = (document: OpenAPIObject): Set<string> => {
  const routes = new Set<string>();

  for (const [path, pathItem] of Object.entries(document.paths)) {
    for (const method of Object.keys(pathItem)) {
      if (HTTP_METHODS.has(method.toLowerCase())) {
        routes.add(`${method.toUpperCase()} ${path}`);
      }
    }
  }

  return routes;
};

describe('OpenAPI contract (US-105)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [DocumentedController, HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {pingDatabase: jest.fn().mockResolvedValue(undefined)},
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication({bodyParser: false, bufferLogs: true});
    app.setGlobalPrefix('api', {exclude: ['health']});
    configureOpenApi(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('fails when an implemented route is missing from the document', () => {
    const implemented = implementedRoutes(app);
    const documented = documentedRoutes(createOpenApiDocument(app));

    expect(implemented.length).toBeGreaterThan(0);
    for (const route of implemented) {
      expect(documented).toContain(route);
    }
  });

  it('derives the bounded list schema from the DTO', () => {
    const document = createOpenApiDocument(app);

    expect(document.components?.schemas?.ListQueryDto).toMatchObject({
      type: 'object',
      properties: {
        limit: {type: 'number', minimum: 1, maximum: 100, default: 20},
      },
    });
  });

  it('serves the Swagger UI at /docs', async () => {
    const response = await request(app.getHttpServer()).get('/docs').expect(200);

    expect(response.headers['content-type']).toContain('text/html');
    expect(response.text).toContain('swagger-ui');
  });

  it('serves the generated document at /docs-json', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(response.body.paths['/api/doc-test/list']).toBeDefined();
  });
});
