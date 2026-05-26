import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { env } from '../config/environment';

async function runSeeds() {
  console.log('🌱 Running database seeds...');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const seedPath = path.join(__dirname, 'seeds', 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf-8');

    await connection.query(seed);
    console.log('✅ Seed data inserted successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeeds();
