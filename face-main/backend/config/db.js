// config/db.js
import { ensurePostgresExtensions, pool } from '../db/index.js';

const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    await ensurePostgresExtensions();
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected successfully');
  } catch (err) {
    console.error('Database connection failed:', err);
    throw err;
  }
};

export default connectDB;
