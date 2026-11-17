import 'reflect-metadata';
import {DataSource, DataSourceOptions} from 'typeorm';
import {parseConfig} from '../config/parse-config';
import {createTypeOrmOptions} from './database.config';

/**
 * CLI entry point for `typeorm migration:run|revert|show` (D77).
 *
 * The API never creates or alters tables at boot: `synchronize` and
 * `migrationsRun` stay `false`, and every schema change ships as a reviewed
 * migration applied as a release step. Use the root scripts `db:migrate`,
 * `db:revert` and `db:show`, which load `.env` before running this file.
 */
const options = createTypeOrmOptions(parseConfig().database);

export default new DataSource(options as DataSourceOptions);
