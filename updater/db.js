import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://propintel:propintel@localhost:5432/propintel',
  ...(process.env.PGPORT ? { port: Number(process.env.PGPORT) } : {}),
});

export function query(text, params) {
  return pool.query(text, params);
}

export async function runSchema(client = pool) {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await client.query(sql);
}
