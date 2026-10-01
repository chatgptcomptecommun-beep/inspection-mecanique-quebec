import { drizzle } from "drizzle-orm/netlify-db";
import { sql } from "drizzle-orm";

const db = drizzle();
let ready: Promise<void> | undefined;

async function createSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS mechanic_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id text NOT NULL UNIQUE,
      first_name text NOT NULL,
      last_name text NOT NULL,
      company text,
      email text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS inspections (
      id uuid PRIMARY KEY,
      owner_id text NOT NULL,
      report_number text NOT NULL,
      status text NOT NULL DEFAULT 'draft',
      inspection_date timestamptz NOT NULL,
      client_id uuid,
      vehicle_id uuid,
      payload jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS audit_events (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id text NOT NULL,
      inspection_id uuid REFERENCES inspections(id) ON DELETE SET NULL,
      action text NOT NULL,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS inspections_owner_report_uq
    ON inspections(owner_id, report_number)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS inspections_owner_date_idx
    ON inspections(owner_id, inspection_date)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS audit_owner_idx ON audit_events(owner_id)
  `);
}

export function ensureSchema() {
  ready ??= createSchema().catch((error) => {
    ready = undefined;
    throw error;
  });
  return ready;
}
