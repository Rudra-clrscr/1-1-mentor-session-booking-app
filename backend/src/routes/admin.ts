import express, { Request, Response } from 'express';
import * as db from '../database';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Get all user sessions (for admin)
router.get('/users', authMiddleware, async (req: Request, res: Response) => {
  try {
    // Check admin status
    const adminCheck = await db.query('SELECT role FROM users WHERE id = $1', [(req as any).user.id]);
    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { search, role, status } = req.query;
    let query = 'SELECT id, name, email, role, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    res.json({ success: true, data: result.rows, users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get dashboard statistics
router.get('/stats', authMiddleware, async (req: Request, res: Response) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = $1', [(req as any).user.id]);
    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get overall stats
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'mentor') as total_mentors,
        (SELECT COUNT(*) FROM users WHERE role = 'student') as total_students,
        (SELECT COUNT(*) FROM sessions) as total_sessions,
        (SELECT COUNT(*) FROM sessions WHERE status = 'completed') as completed_sessions,
        (SELECT COUNT(*) FROM ratings) as total_ratings,
        (SELECT COALESCE(AVG(rating), 0) FROM ratings) as avg_rating,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue
    `);

    res.json({ success: true, data: stats.rows[0], stats: stats.rows[0] });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Suspend/Unsuspend user
router.patch('/users/:userId/suspend', authMiddleware, async (req: Request, res: Response) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = $1', [(req as any).user.id]);
    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;
    const { isSuspended, reason } = req.body;

    await db.query(
      `UPDATE users SET is_suspended = $1, suspension_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [isSuspended, reason, userId]
    );

    res.json({ success: true, message: isSuspended ? 'User suspended' : 'User unsuspended' });
  } catch (error) {
    console.error('Error updating user suspension:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get session moderation queue
router.get('/moderation/queue', authMiddleware, async (req: Request, res: Response) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = $1', [(req as any).user.id]);
    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await db.query(`
      SELECT s.id, s.title, u.name as mentor_name, r.rating, r.review as comment, r.created_at
      FROM sessions s
      JOIN users u ON s.mentor_id = u.id
      LEFT JOIN ratings r ON s.id = r.session_id
      WHERE s.status = 'completed' AND s.flagged_for_review = true
      ORDER BY s.updated_at DESC
    `);

    res.json({ success: true, data: result.rows, queue: result.rows });
  } catch (error) {
    console.error('Error fetching moderation queue:', error);
    res.status(500).json({ error: 'Failed to fetch moderation queue' });
  }
});

// Flag session for review
router.post('/moderation/flag/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    await db.query(
      `UPDATE sessions SET flagged_for_review = true, review_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [reason, sessionId]
    );

    res.json({ success: true, message: 'Session flagged for review' });
  } catch (error) {
    console.error('Error flagging session:', error);
    res.status(500).json({ error: 'Failed to flag session' });
  }
});

// Get reports
router.get('/reports', authMiddleware, async (req: Request, res: Response) => {
  try {
    const adminCheck = await db.query('SELECT role FROM users WHERE id = $1', [(req as any).user.id]);
    if (adminCheck.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await db.query(`
      SELECT id, reporter_user_id, reported_user_id, reason, description, status, created_at
      FROM user_reports
      ORDER BY created_at DESC
    `);

    res.json({ success: true, data: result.rows, reports: result.rows });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

export default router;
