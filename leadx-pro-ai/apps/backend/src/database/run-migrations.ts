import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { env } from '../config/environment';

async function runMigrations() {
  console.log('🔄 Running database migrations...');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    // Step 1: Run base schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    await connection.query(schema);
    console.log('✅ Database schema created successfully');

    // Step 2: Run incremental migration files from migrations/ directory
    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort(); // Alphabetical order ensures correct execution sequence (001, 002, 003...)

      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        try {
          console.log(`🔄 Running migration: ${file}...`);
          await connection.query(sql);
          console.log(`✅ Migration ${file} applied successfully`);
        } catch (err: any) {
          if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
            console.log(`⚠️ Migration ${file} skipped (already applied)`);
          } else {
            throw err;
          }
        }
      }

      console.log(`✅ All ${migrationFiles.length} migration(s) applied or skipped`);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();

