import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    console.log('Running 0036_add_employee_agreements migration...');
    const sqlPath = path.resolve(__dirname, '../db/migrations/0036_add_employee_agreements.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    const statements = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);

    await pool.query('BEGIN');
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    await pool.query('COMMIT');
    console.log('Migration 0036 executed successfully!');

    const check = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('agreement_templates', 'employee_agreements', 'agreement_signing_links')
    `);
    console.log('Created tables:', check.rows.map(r => r.table_name));
    process.exit(0);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
