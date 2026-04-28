'use server';

import { getRecursiv } from './recursiv';

const PROJECT_ID = process.env.RECURSIV_PROJECT_ID;
const DB_NAME = 'app-db';

if (!PROJECT_ID) {
  // eslint-disable-next-line no-console
  console.warn('[recursiv] RECURSIV_PROJECT_ID is not set. Database calls will fail until it is.');
}

let _ensured = false;

/** Provision the database (idempotent — safe to call on every request). */
export async function ensureDb(): Promise<void> {
  if (_ensured) return;
  if (!PROJECT_ID) throw new Error('RECURSIV_PROJECT_ID env var is not set.');
  const r = getRecursiv();
  await r.databases.ensure({ project_id: PROJECT_ID, name: DB_NAME });
  _ensured = true;
}

/** Run a SQL query. Returns typed rows. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[],
): Promise<T[]> {
  await ensureDb();
  const r = getRecursiv();
  const { data } = await r.databases.query({
    project_id: PROJECT_ID!,
    database_name: DB_NAME,
    sql,
    params,
  });
  return data.rows as T[];
}

/** Run migrations once on app boot. Safe to call repeatedly. */
export async function migrate(statements: string[]): Promise<void> {
  await ensureDb();
  for (const sql of statements) {
    await query(sql);
  }
}
