import bcrypt from 'bcryptjs';
import { query } from '@/database';

// Test user credentials
const testUsers = [
  {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    email: 'john_mentor@example.com',
    name: 'John Mentor',
    role: 'mentor',
    password: 'password123'
  },
  {
    userId: '550e8400-e29b-41d4-a716-446655440002',
    email: 'jane_mentor@example.com',
    name: 'Jane Mentor',
    role: 'mentor',
    password: 'password123'
  },
  {
    userId: '550e8400-e29b-41d4-a716-446655440003',
    email: 'bob_student@example.com',
    name: 'Bob Student',
    role: 'student',
    password: 'password123'
  },
  {
    userId: '550e8400-e29b-41d4-a716-446655440004',
    email: 'alice_student@example.com',
    name: 'Alice Student',
    role: 'student',
    password: 'password123'
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...\n');

    const now = new Date().toISOString();

    // Step 1: Insert test users into users table
    console.log('👥 Creating test users...');
    for (const user of testUsers) {
      // Check if user already exists
      const existing = await query(
        'SELECT id FROM users WHERE id = $1',
        [user.userId]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠️  User already exists: ${user.email}, skipping...`);
        continue;
      }

      await query(
        `INSERT INTO users (id, email, name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user.userId, user.email, user.name, user.role, now, now]
      );

      console.log(`✅ User created: ${user.email}`);
    }
    console.log();

    // Step 2: Generate bcrypt hashes for all test users
    console.log('🔐 Hashing passwords...');
    const hashedUsers = await Promise.all(
      testUsers.map(async (user) => ({
        ...user,
        passwordHash: await bcrypt.hash(user.password, 10)
      }))
    );
    console.log('✅ Passwords hashed\n');

    // Step 3: Insert password hashes
    console.log('💾 Inserting test user passwords...');
    for (const user of hashedUsers) {
      // Check if password already exists
      const existing = await query(
        'SELECT id FROM user_passwords WHERE user_id = $1',
        [user.userId]
      );

      if (existing.rows.length > 0) {
        console.log(`⚠️  Password already exists for ${user.email}, skipping...`);
        continue;
      }

      await query(
        `INSERT INTO user_passwords (user_id, password_hash, created_at, updated_at)
         VALUES ($1, $2, $3, $4)`,
        [user.userId, user.passwordHash, now, now]
      );

      console.log(`✅ Password created for ${user.email}`);
    }

    console.log('\n✅ Database seeding completed!\n');
    console.log('📋 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    for (const user of testUsers) {
      console.log(`\n${user.role === 'mentor' ? '👨‍🏫' : '👨‍🎓'} ${user.name}`);
      console.log(`   Email:    ${user.email}`);
      console.log(`   Password: ${user.password}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seedDatabase();
