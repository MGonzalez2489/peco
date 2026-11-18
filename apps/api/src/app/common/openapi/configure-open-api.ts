import type {INestApplication} from '@nestjs/common';
import {SwaggerModule} from '@nestjs/swagger';
import {createOpenApiDocument} from './create-open-api-document';

const DOCS_PATH = 'docs';

/** Publishes the generated document at `/docs` and its JSON at `/docs-json`. */
export const configureOpenApi = (app: INestApplication): void => {
  SwaggerModule.setup(DOCS_PATH, app, () => createOpenApiDocument(app), {
    jsonDocumentUrl: `${DOCS_PATH}-json`,
  });
};
