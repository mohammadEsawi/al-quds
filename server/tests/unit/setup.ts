// Unit tests import modules that read server/.env through config/env.ts. Give them harmless values,
// and never let a developer's real .env decide what a test does. Import this file FIRST in every test.
process.env['DATABASE_URL'] = 'postgresql://unit:unit@127.0.0.1:1/unit_test';
process.env['JWT_SECRET'] = 'unit-test-secret-unit-test-secret-unit-test-secret';
process.env['NODE_ENV'] = 'test';
process.env['DOTENV_CONFIG_PATH'] = 'lamico-tests-no-such.env';
for (const key of ['DATA_ENCRYPTION_KEY', 'CLAMAV_HOST', 'BACKUP_PASSPHRASE', 'PG_BIN_DIR']) delete process.env[key];
export {};
