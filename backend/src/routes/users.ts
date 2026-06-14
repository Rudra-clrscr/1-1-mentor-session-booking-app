import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';

const router = Router();

// Get all mentors (MUST come before /:id)
router.get('/mentors', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mentors = await query(
      'SELECT id, email, name, avatar_url, bio, role, avg_rating::float8 as avg_rating, total_sessions FROM users WHERE role = $1 ORDER BY created_at DESC LIMIT 100',
      ['mentor']
    );

    console.log('Fetching mentors:', mentors.rows.length);

    res.json({
      success: true,
      data: mentors.rows,
    });
  } catch (err) {
    console.error('Get mentors error:', err);
    res.status(500).json({ error: 'Failed to get mentors' });
  }
});

// Get all students (MUST come before /:id)
router.get('/students', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const students = await query(
      'SELECT id, email, name, avatar_url, bio FROM users WHERE role = $1 LIMIT 50',
      ['student']
    );

    res.json({
      success: true,
      data: students.rows,
    });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, bio, avatar_url } = req.body;
    const now = new Date().toISOString();

    await query(
      'UPDATE users SET name = $1, bio = $2, avatar_url = $3, updated_at = $4 WHERE id = $5',
      [name, bio, avatar_url, now, req.user?.id]
    );

    const updatedUser = await queryOne('SELECT * FROM users WHERE id = $1', [req.user?.id]);

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user profile by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne(
      'SELECT id, email, name, role, avatar_url, bio, verified, avg_rating::float8 as avg_rating, total_sessions FROM users WHERE id = $1',
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get all users (backward compatibility)
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const mentors = await query(
      'SELECT id, email, name, avatar_url, bio FROM users WHERE role = $1 LIMIT 50',
      ['mentor']
    );

    res.json({
      success: true,
      data: mentors.rows,
    });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

export default router;
