import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

async function runSeeds() {
  if (!connectionString) {
    logger.error('No DATABASE_URL or SUPABASE_DB_URL provided for seeding');
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
    logger.info('Connected to database. Running seeds...');
    const seedsDir = path.resolve(__dirname, '../../../database/seeds');
    const files = fs.readdirSync(seedsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const filePath = path.join(seedsDir, file);
      logger.info(`Applying seed: ${file}`);
      const sql = fs.readFileSync(filePath, 'utf-8');
      await client.query(sql);
      logger.info(`Seed applied successfully: ${file}`);
    }

    logger.info('All seed data inserted successfully.');
  } catch (err: unknown) {
    logger.error('Seeding failed:', { err });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runSeeds();
