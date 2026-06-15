import { Router, Response } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { config } from '@/config';
import { v4 as uuidv4 } from 'uuid';

// Rate limiter for login: 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,  // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

// Rate limiter for signup: 5 accounts per hour per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again after an hour.' },
});

const router = Router();
const jwtSecret: Secret = config.JWT_SECRET as Secret;
const jwtOptions: SignOptions = { expiresIn: config.JWT_EXPIRY as any };

// Signup
router.post('/signup', signupLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate input
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Missing required fields: email, password, name, role' });
    }

    // Validate password strength (minimum 8 characters)
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Validate role - never trust client input blindly
    if (!['mentor', 'student'].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be 'mentor' or 'student'." });
    }

    // Check if user exists
    const existing = await queryOne(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password with bcrypt (10 rounds)
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('✅ Password hashed successfully for signup');

    const userId = uuidv4();
    const now = new Date().toISOString();

    // Create user in users table
    await query(
      `INSERT INTO users (id, email, name, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, email, name, role, now, now]
    );
    console.log('✅ User created:', { id: userId, email, role });

    // Store hashed password in user_passwords table
    await query(
      `INSERT INTO user_passwords (user_id, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, hashedPassword, now, now]
    );
    console.log('✅ Password stored securely in user_passwords table');

    // Generate JWT token
    const token = jwt.sign(
      { id: userId, email, role },
      jwtSecret,
      jwtOptions
    );

    res.json({
      success: true,
      message: 'Signup successful',
      data: {
        user: { id: userId, email, name, role },
        token,
      },
    });
  } catch (err) {
    console.error('❌ Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// Login
router.post('/login', loginLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const user = await queryOne(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email]
    );

    if (!user) {
      console.warn('⚠️  Login attempt for non-existent user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get password hash from user_passwords table
    const userPassword = await queryOne(
      'SELECT password_hash FROM user_passwords WHERE user_id = $1',
      [user.id]
    );

    if (!userPassword) {
      console.error('❌ No password found for user:', user.id);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, userPassword.password_hash);

    if (!isPasswordValid) {
      console.warn('⚠️  Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('✅ Password verified successfully for user:', email);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      jwtSecret,
      jwtOptions
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token,
      },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user?.id]
    );

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Logged out' });
});

// Change password (requires authentication)
router.post('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from old password' });
    }

    // Get current password hash
    const userPassword = await queryOne(
      'SELECT password_hash FROM user_passwords WHERE user_id = $1',
      [userId]
    );

    if (!userPassword) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, userPassword.password_hash);

    if (!isOldPasswordValid) {
      console.warn('⚠️  Invalid old password for user:', userId);
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    // Update password
    await query(
      `UPDATE user_passwords 
       SET password_hash = $1, updated_at = $2 
       WHERE user_id = $3`,
      [hashedNewPassword, now, userId]
    );

    console.log('✅ Password changed successfully for user:', userId);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    console.error('❌ Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;