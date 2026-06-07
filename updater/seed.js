import 'dotenv/config';
import { pool, runSchema } from './db.js';
import { runAllSources } from './run.js';

const SEED_ZIPS = (process.env.SEED_ZIPS || '17101,17102,19103,15213').split(',').map((z) => z.trim());

async function main() {
  await runSchema();
  const summary = await runAllSources({ zips: SEED_ZIPS });
  // eslint-disable-next-line no-console
  console.log('Seed complete:', JSON.stringify(summary));
  await pool.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Seed failed:', err);
  await pool.end();
  process.exit(1);
});
