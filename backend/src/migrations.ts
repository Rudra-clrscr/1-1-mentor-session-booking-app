import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { config } from './config';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DB_SSL ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...\n');

    // Get all migration files sorted by name
    // migrations.ts is in src/, SQL files are in src/migrations/
    const migrationsDir = path.join(__dirname, 'migrations');
    console.log(`📂 Looking for migrations in: ${migrationsDir}`);
    
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }
    
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    console.log(`📋 Found ${files.length} migration files: ${files.join(', ')}\n`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf-8');

      console.log(`📋 Running migration: ${file}`);
      
      try {
        await client.query(sql);
        console.log(`✅ Successfully applied: ${file}\n`);
      } catch (err: any) {
        // Check if error is "already exists" - that's ok
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log(`⚠️  Skipped (already exists): ${file}\n`);
        } else {
          console.error(`❌ Error in ${file}:`, err.message);
          throw err;
        }
      }
    }

    console.log('✅ All migrations completed successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
