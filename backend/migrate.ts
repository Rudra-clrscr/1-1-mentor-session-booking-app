import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbSsl = process.env.DB_SSL ? process.env.DB_SSL === 'true' : !(process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), '../database/migrations', '001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    console.log('⏳ Creating tables...');
    await pool.query(sql);
    console.log('✅ Migration completed successfully!\n');

    // Seed sample data
    console.log('⏳ Seeding sample data...');
    const seedPath = path.join(process.cwd(), '../database/seeds', '001_sample_data.sql');
    if (fs.existsSync(seedPath)) {
      const seedSql = fs.readFileSync(seedPath, 'utf-8');
      await pool.query(seedSql);
      console.log('✅ Sample data seeded successfully!\n');
    }

    // Verify tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`📊 Database setup complete! Created ${tables.rows.length} tables:\n`);
    tables.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err instanceof Error ? err.message : err);
    await pool.end();
    process.exit(1);
  }
}

runMigrations();
