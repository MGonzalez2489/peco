import {MigrationInterface, QueryRunner} from 'typeorm';

const TIMESTAMP = 'VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin';
const PUBLIC_ID = 'CHAR(36) CHARACTER SET ascii COLLATE ascii_bin';

/** Adds the durable job-lock table required by US-1001. */
export class JobLocks1795564800000 implements MigrationInterface {
  name = 'JobLocks1795564800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE \`jobLocks\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        \`publicId\` ${PUBLIC_ID} NOT NULL,
        \`createdAt\` ${TIMESTAMP} NOT NULL,
        \`updatedAt\` ${TIMESTAMP} NOT NULL,
        \`jobKey\` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
        \`lockToken\` ${PUBLIC_ID} NOT NULL,
        \`expiresAt\` ${TIMESTAMP} NOT NULL,
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`UQJobLocksPublicId\` UNIQUE (\`publicId\`),
        CONSTRAINT \`UQJobLocksJobKey\` UNIQUE (\`jobKey\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `jobLocks`');
  }
}
