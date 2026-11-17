import {DefaultNamingStrategy, NamingStrategyInterface, Table} from 'typeorm';

const pascalCase = (value: string): string =>
  value.length === 0 ? value : value[0].toUpperCase() + value.slice(1);

const tableNameOf = (tableOrName: Table | string): string =>
  pascalCase(typeof tableOrName === 'string' ? tableOrName : tableOrName.name);

const suffixOf = (columnNames: string[]): string => columnNames.map(pascalCase).join('');

/**
 * Deterministic, readable constraint names that match the reviewed migration:
 * `UQUsersEmail`, `IDXMovementsUserIdDate`, `FKAccountsUserId`. Table and
 * column names stay camelCase because every entity declares them explicitly.
 */
export class CamelCaseNamingStrategy
  extends DefaultNamingStrategy
  implements NamingStrategyInterface
{
  override tableName(targetName: string, userSpecifiedName: string | undefined): string {
    return userSpecifiedName ?? targetName;
  }

  override columnName(
    propertyName: string,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    return customName ?? `${embeddedPrefixes.join('')}${propertyName}`;
  }

  override primaryKeyName(tableOrName: Table | string): string {
    return `PK${tableNameOf(tableOrName)}`;
  }

  override uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    return `UQ${tableNameOf(tableOrName)}${suffixOf(columnNames)}`;
  }

  override foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return `FK${tableNameOf(tableOrName)}${suffixOf(columnNames)}`;
  }

  override indexName(tableOrName: Table | string, columnNames: string[]): string {
    return `IDX${tableNameOf(tableOrName)}${suffixOf(columnNames)}`;
  }
}
