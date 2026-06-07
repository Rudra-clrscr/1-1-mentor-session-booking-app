const axios = require('axios');
const pg = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const dbSsl = process.env.DB_SSL ? process.env.DB_SSL === 'true' : !(process.env.DATABASE_URL && (process.env.DATABASE_URL.includes('localhost') || process.env.DATABASE_URL.includes('127.0.0.1')));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: dbSsl ? { rejectUnauthorized: false } : false
});

(async () => {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('PLATFORM VERIFICATION TEST');
    console.log('='.repeat(60));
    
    // Get a student
    const studentRes = await pool.query(`SELECT id, email, name FROM users WHERE role = 'student' LIMIT 1`);
    const student = studentRes.rows[0];
    
    // Generate token
    const jwtSecret = process.env.JWT_SECRET || 'mentor-app-jwt-secret-key-change-in-production';
    const token = jwt.sign(
      { id: student.id, email: student.email },
      jwtSecret,
      { expiresIn: '1h' }
    );
    
    // Test the API
    const client = axios.create({
      baseURL: process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:5001',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`\n📌 Student: ${student.name}\n`);
    
    // Get available sessions
    try {
      const res = await client.get('/api/sessions/available');
      console.log(`✅ /api/sessions/available: ${res.data.data.length} sessions found`);
      
      res.data.data.forEach((s, i) => {
        console.log(`   ${i+1}. "${s.title}" (${s.code_language}, Duration: ${s.duration_minutes}m)`);
      });
    } catch (e) {
      console.log(`❌ /api/sessions/available failed: ${e.message}`);
    }
    
    // Get mentors
    try {
      const res = await client.get('/api/users/mentors');
      console.log(`\n✅ /api/users/mentors: ${res.data.data.length} mentors found`);
      
      res.data.data.forEach((m, i) => {
        console.log(`   ${i+1}. ${m.name} (${m.email})`);
      });
    } catch (e) {
      console.log(`❌ /api/users/mentors failed: ${e.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ FRONTEND CAN NOW ACCESS:');
    console.log('='.repeat(60));
    console.log('\n🌐 http://localhost:3000');
    console.log('\n📝 Test User (Student):');
    console.log(`   Email: ${student.email}`);
    console.log('\n✨ What to test:');
    console.log('   1. Go to /browse page');
    console.log('   2. You should see 3 available sessions');
    console.log('   3. Click on any session to join');
    console.log('   4. Check /dashboard for My Sessions');
    console.log('\n' + '='.repeat(60) + '\n');
    
    await pool.end();
  } catch(e) {
    console.error('Test error:', e.message);
    process.exit(1);
  }
})();
