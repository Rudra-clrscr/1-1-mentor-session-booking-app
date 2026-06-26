import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { requireRole } from '@/middleware/requireRole';

const router = Router();

router.use(authMiddleware, requireRole('admin'));

// Get all users (for admin)
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { search, role } = req.query;
    let sql = 'SELECT id, name, email, role, is_suspended, suspension_reason, created_at FROM users WHERE 1=1';
    const params: any[] = [];

    if (search) {
      sql += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (role) {
      sql += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, users: result.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get all sessions platform-wide (for admin)
router.get('/sessions', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT s.id, s.title, s.status, s.scheduled_at, s.started_at, s.ended_at, s.created_at,
             m.name AS mentor_name, m.email AS mentor_email,
             st.name AS student_name, st.email AS student_email
      FROM sessions s
      JOIN users m ON s.mentor_id = m.id
      LEFT JOIN users st ON s.student_id = st.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      sql += ` AND s.status = $${params.length + 1}`;
      params.push(status);
    }

    sql += ' ORDER BY s.created_at DESC LIMIT 200';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows, sessions: result.rows });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get dashboard statistics
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await query(`
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
router.patch('/users/:userId/suspend', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { isSuspended, reason } = req.body;

    await query(
      `UPDATE users SET is_suspended = $1, suspension_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [isSuspended, reason ?? null, userId]
    );

    res.json({ success: true, message: isSuspended ? 'User suspended' : 'User unsuspended' });
  } catch (error) {
    console.error('Error updating user suspension:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get session moderation queue
router.get('/moderation/queue', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
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
router.post('/moderation/flag/:sessionId', async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { reason } = req.body;

    await query(
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

// Get mentors for verification review
router.get('/mentors/verification', async (req: AuthRequest, res: Response) => {
  try {
    const { status, search } = req.query;
    let sql = `SELECT id, name, email, bio, hourly_rate, verified, verification_date, created_at
               FROM users WHERE role = 'mentor'`;
    const params: any[] = [];

    if (status === 'pending') {
      sql += ' AND verified = false';
    } else if (status === 'verified') {
      sql += ' AND verified = true';
    }

    if (search) {
      sql += ` AND (name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    sql += ' ORDER BY verified ASC, created_at DESC';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching mentors for verification:', error);
    res.status(500).json({ error: 'Failed to fetch mentors' });
  }
});

// Verify or unverify a mentor
router.patch('/mentors/:userId/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { verified, note } = req.body;
    const adminId = req.user?.id;

    if (typeof verified !== 'boolean') {
      return res.status(400).json({ error: 'verified must be a boolean' });
    }

    const mentor = await queryOne(`SELECT id FROM users WHERE id = $1 AND role = 'mentor'`, [userId]);
    if (!mentor) {
      return res.status(404).json({ error: 'Mentor not found' });
    }

    await query(
      `UPDATE users SET verified = $1, verification_date = $2, updated_at = NOW() WHERE id = $3`,
      [verified, verified ? new Date().toISOString() : null, userId]
    );

    await query(
      `INSERT INTO admin_audit_log (admin_id, action, target_user_id, note)
       VALUES ($1, $2, $3, $4)`,
      [adminId, verified ? 'mentor_verified' : 'mentor_unverified', userId, note ?? null]
    );

    res.json({ success: true, message: verified ? 'Mentor verified' : 'Mentor verification revoked' });
  } catch (error) {
    console.error('Error updating mentor verification:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Get verification audit log
router.get('/audit-log', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
      SELECT l.id, l.action, l.note, l.created_at,
             a.name AS admin_name, t.name AS target_name, t.email AS target_email
      FROM admin_audit_log l
      JOIN users a ON l.admin_id = a.id
      JOIN users t ON l.target_user_id = t.id
      ORDER BY l.created_at DESC
      LIMIT 200
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// Get reports
router.get('/reports', async (req: AuthRequest, res: Response) => {
  try {
    const result = await query(`
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
