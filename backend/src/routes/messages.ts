import { Router, Response } from 'express';
import { query, queryOne } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';

const router = Router();

// Get messages for session
router.get('/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await query<any>(
      `SELECT m.id, m.session_id, m.user_id, m.content, m.type, m.attachment, m.created_at,
              json_build_object('id', u.id, 'name', u.name, 'email', u.email, 'avatar', u.avatar_url) as user
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.session_id = $1
       ORDER BY m.created_at ASC`,
      [req.params.sessionId]
    );

    // Transform the result to include user object properly
    const messages = result.rows.map((msg: any) => ({
      id: msg.id,
      session_id: msg.session_id,
      user_id: msg.user_id,
      content: msg.content,
      type: msg.type,
      attachment: msg.attachment,
      created_at: msg.created_at,
      user: msg.user,
    }));

    res.json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Send message
router.post('/:sessionId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { content, type = 'text', code_snippet, attachment } = req.body;
    const now = new Date().toISOString();

    const result = await queryOne(
      `INSERT INTO messages (session_id, user_id, content, type, code_snippet, attachment, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.params.sessionId, req.user?.id, content, type, code_snippet, attachment ? JSON.stringify(attachment) : null, now]
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
