/**
 * Version of the monetary storage schema.
 *
 * Version `2` is the first one that stores every amount as integer cents, so a
 * missing or older value means the persisted payload is still decimal.
 */
export const AMOUNT_SCHEMA_VERSION = '2';
