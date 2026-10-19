import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function runMigrations() {
  if (!connectionString) {
    logger.error('No DATABASE_URL or SUPABASE_DB_URL provided for migrations');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' || connectionString.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
  });

  const client = await pool.connect();
  try {
    logger.info('Connected to database. Running migrations...');
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      logger.info(`Applying migration: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      logger.info(`Migration applied successfully: ${file}`);
    }

    logger.info('All migrations completed successfully.');
  } catch (err: unknown) {
    logger.error('Migration failed:', { err });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
