import {Global, Module, type DynamicModule} from '@nestjs/common';
import {DataSource} from 'typeorm';
import {getE2eDataSource} from './e2e-data-source';

/**
 * Jest-only stand-in for the ESM-only `@nestjs/typeorm` package. It preserves the
 * real `DataSource` provider that every repository injects, without a second
 * connection or a native-ESM runner.
 */
@Global()
@Module({})
export class TypeOrmModule {
  static forRootAsync(...options: unknown[]): DynamicModule {
    void options;
    return {
      module: TypeOrmModule,
      providers: [{provide: DataSource, useFactory: () => getE2eDataSource()}],
      exports: [DataSource],
    };
  }

  static forFeature(...entities: unknown[]): DynamicModule {
    void entities;
    return {module: TypeOrmModule, exports: []};
  }
}
