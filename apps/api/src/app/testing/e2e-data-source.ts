import type {DataSource} from 'typeorm';

let current: DataSource | undefined;

/** Test-only handoff so the mapped TypeOrmModule stub reuses the suite's DataSource. */
export const setE2eDataSource = (dataSource: DataSource): void => {
  current = dataSource;
};

export const getE2eDataSource = (): DataSource => {
  if (!current) {
    throw new Error('E2E DataSource has not been configured');
  }
  return current;
};

export const clearE2eDataSource = (): void => {
  current = undefined;
};
