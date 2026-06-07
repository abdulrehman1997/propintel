import pg from 'pg';

const { Pool } = pg;
let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgres://propintel:propintel@localhost:5432/propintel',
      ...(process.env.PGPORT ? { port: Number(process.env.PGPORT) } : {}),
    });
  }
  return pool;
}

export function query(text, params) {
  return getPool().query(text, params);
}
