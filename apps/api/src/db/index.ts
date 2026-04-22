import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import '../load-root-env.js';
import * as schema from './schema.js';

const url = process.env.DATABASE_URL;
if (!url) {
	throw new Error('DATABASE_URL is required');
}

const pool = mysql.createPool(url);

export const db = drizzle(pool, { schema, mode: 'default' });
export { pool };
