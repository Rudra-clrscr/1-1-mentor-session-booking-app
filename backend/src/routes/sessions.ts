import { Router, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { query, queryOne, transaction } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { requireRole } from '@/middleware/requireRole';
import { v4 as uuidv4 } from 'uuid';

class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

const router = Router();

// Socket.io instance for emitting events
let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

// Create session (mentor only)
router.post('/', authMiddleware, requireRole('mentor'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, topic, scheduled_at, duration_minutes, language, code_language } =
      req.body;

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    // Use provided scheduled_at or default to now if not provided
    const sessionScheduledAt = scheduled_at || now;

    await query(
      `INSERT INTO sessions (id, mentor_id, title, description, topic, status, scheduled_at, duration_minutes, language, code_language, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9, $10, $11)`,
      [
        sessionId,
        req.user?.id,
        title,
        description,
        topic,
        sessionScheduledAt,
        duration_minutes || 60,
        language || 'javascript',
        code_language || 'javascript',
        now,
        now,
      ]
    );

    const newSession = await queryOne('SELECT * FROM sessions WHERE id = $1', [sessionId]);

    res.json({
      success: true,
      data: newSession,
    });
  } catch (err) {
    console.error('Create session error:', err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get active sessions (MUST come before /:id)
router.get('/active', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await query(
      'SELECT * FROM sessions WHERE status = $1 AND (mentor_id = $2 OR student_id = $2)',
      ['in_progress', req.user?.id]
    );

    res.json({
      success: true,
      data: sessions.rows,
    });
  } catch (err) {
    console.error('Get active sessions error:', err);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get available sessions (scheduled sessions that students can join) (MUST come before /:id)
router.get('/available', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Return all scheduled sessions (no student_id yet) regardless of who created them
    const sessions = await query(
      'SELECT * FROM sessions WHERE status = $1 AND student_id IS NULL ORDER BY created_at DESC LIMIT 100',
      ['scheduled']
    );

    console.log('Available sessions:', sessions.rows.length);

    res.json({
      success: true,
      data: sessions.rows,
    });
  } catch (err) {
    console.error('Get available sessions error:', err);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Get user sessions (MUST come before /:id)
router.get('/user', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await query(
      'SELECT * FROM sessions WHERE mentor_id = $1 OR student_id = $1 ORDER BY created_at DESC',
      [req.user?.id]
    );

    res.json({
      success: true,
      data: sessions.rows,
    });
  } catch (err) {
    console.error('Get user sessions error:', err);
    res.status(500).json({ error: 'Failed to get user sessions' });
  }
});

// Get session by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await queryOne('SELECT * FROM sessions WHERE id = $1', [req.params.id]);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Restrict access to booked sessions to only the participants
    if (session.student_id && session.student_id !== req.user?.id && session.mentor_id !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized to view this session' });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (err) {
    console.error('Get session error:', err);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// Join session (student only)
router.post('/:id/join', authMiddleware, requireRole('student'), async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();
    const studentId = req.user?.id;

    const sessionData = await transaction(async (client) => {
      // Lock the row exclusively — concurrent requests for the same session block here
      // until this transaction commits or rolls back, eliminating the TOCTOU race.
      const lockResult = await client.query(
        'SELECT * FROM sessions WHERE id = $1 FOR UPDATE',
        [req.params.id]
      );

      if (lockResult.rows.length === 0) {
        throw new HttpError(404, 'Session not found');
      }

      const session = lockResult.rows[0];

      if (session.mentor_id === studentId) {
        throw new HttpError(400, 'Mentors cannot join their own sessions');
      }

      if (session.status === 'completed' || session.status === 'cancelled') {
        throw new HttpError(400, 'This session is no longer available to join');
      }

      if (session.student_id === studentId) {
        return session;
      }

      if (session.student_id) {
        throw new HttpError(409, 'This session has already been joined by another student');
      }

      await client.query(
        'UPDATE sessions SET student_id = $1, status = $2, started_at = $3, updated_at = $4 WHERE id = $5',
        [studentId, 'in_progress', now, now, req.params.id]
      );

      const updated = await client.query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
      return updated.rows[0];
    });

    return res.json({
      success: true,
      data: sessionData,
    });
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error('Join session error:', err);
    return res.status(500).json({ error: 'Failed to join session' });
  }
});

// End session (mentor only)
router.post('/:id/end', authMiddleware, requireRole('mentor'), async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date().toISOString();

    // 1. Fetch the session
    const session = await queryOne('SELECT * FROM sessions WHERE id = $1', [req.params.id]);

    // 2. Check if it exists
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // 3. Verify authorization (Mentor only)
    if (session.mentor_id !== req.user?.id) {
      return res.status(403).json({ error: 'You are not authorized to end this session' });
    }

    await query(
      'UPDATE sessions SET status = $1, ended_at = $2, updated_at = $3 WHERE id = $4',
      ['completed', now, now, req.params.id]
    );

    const updatedSession = await queryOne('SELECT * FROM sessions WHERE id = $1', [req.params.id]);

    res.json({
      success: true,
      data: updatedSession,
    });
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Failed to end session' });
  }
});

// Generate video conference code (4 digits)
router.post('/:id/video-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.params.id;

    console.log('\n============================================================');
    console.log('📝 GENERATE CODE REQUEST');
    console.log(`   Session ID: ${sessionId}`);
    console.log('============================================================\n');

    // First verify session exists
    const sessionCheck = await queryOne('SELECT id, mentor_id, student_id, video_code FROM sessions WHERE id = $1', [sessionId]);
    if (!sessionCheck) {
      console.error('❌ Session not found');
      return res.status(404).json({ error: 'Session not found' });
    }
    console.log('✅ Session exists');

    // Restrict to session participants
    if (sessionCheck.mentor_id !== req.user?.id && sessionCheck.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized to generate code for this session' });
    }

    // Check if there's already an unexpired code
    if (sessionCheck.video_code) {
      const existingCode = await queryOne(
        'SELECT video_code, video_code_expires_at FROM sessions WHERE id = $1 AND video_code IS NOT NULL AND video_code_expires_at > NOW()',
        [sessionId]
      );

      if (existingCode?.video_code) {
        console.log(`♻️  Returning existing code: ${existingCode.video_code}`);
        return res.json({
          success: true,
          data: { code: existingCode.video_code },
        });
      }
    }

    const code = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    // Use Unix timestamp (milliseconds) to avoid timezone issues
    const expiresAtMs = Date.now() + 10 * 60 * 1000;
    // Convert to ISO string for storage (will be stored as UTC in TIMESTAMP WITH TIME ZONE)
    const expiresAtISO = new Date(expiresAtMs).toISOString();

    console.log(`   Generating Code: ${code}`);
    console.log(`   Expires At (Unix MS): ${expiresAtMs}`);
    console.log(`   Expires At (ISO): ${expiresAtISO}`);

    // Store code in sessions table - ISO string will be stored as UTC in TIMESTAMP WITH TIME ZONE
    try {
      console.log('⏳ Storing code in database...');
      await query(
        'UPDATE sessions SET video_code = $1, video_code_expires_at = $2::timestamp with time zone WHERE id = $3',
        [code, expiresAtISO, sessionId]
      );
      console.log('✅ Update query executed');
    } catch (updateErr) {
      console.error('❌ Update query failed:', updateErr);
      throw updateErr;
    }

    // Verify it was actually stored (critical check)
    console.log('⏳ Verifying code was stored...');
    const verifyStore = await queryOne(
      'SELECT video_code, video_code_expires_at FROM sessions WHERE id = $1',
      [sessionId]
    );

    console.log('📊 Database verification:', {
      storedCode: verifyStore?.video_code || '(NULL)',
      expectedCode: code,
      storedExpiryTimestamp: verifyStore?.video_code_expires_at,
      match: verifyStore?.video_code === code
    });

    if (verifyStore?.video_code !== code) {
      console.error('❌ CODE STORAGE FAILED!');
      console.error(`   Expected: ${code}`);
      console.error(`   Got: ${verifyStore?.video_code}`);
      return res.status(500).json({
        error: 'Failed to store code in database',
        expected: code,
        stored: verifyStore?.video_code
      });
    }

    console.log('✅ Code verified in database');
    console.log('✅ RESPONSE: Sending code back to frontend\n');

    res.json({
      success: true,
      data: { code },
    });
  } catch (err) {
    console.error('❌ Generate code error:', err);
    res.status(500).json({
      error: 'Failed to generate video code',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

// Verify video conference code
router.post('/:id/verify-video-code', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const sessionId = req.params.id;
    const nowMs = Date.now();

    console.log('\n============================================================');
    console.log('🔍 VERIFY CODE REQUEST');
    console.log(`   Session ID: ${sessionId}`);
    console.log(`   Provided Code: ${code}`);
    console.log(`   Current Time MS: ${nowMs}`);
    console.log('============================================================\n');

    if (!code) {
      console.warn('⚠️ Code is required but was not provided');
      return res.status(400).json({ error: 'Code is required' });
    }

    const session = await queryOne(
      'SELECT mentor_id, student_id, video_code, video_code_expires_at FROM sessions WHERE id = $1',
      [sessionId]
    );

    console.log('📊 Database lookup:', {
      sessionFound: !!session,
      storedCode: session?.video_code || '(NULL)',
      expiresAt: session?.video_code_expires_at || '(NULL)'
    });

    if (!session) {
      console.error('❌ Session not found');
      return res.status(404).json({ error: 'Session not found' });
    }

    // Restrict to session participants
    if (session.mentor_id !== req.user?.id && session.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized to verify code for this session' });
    }

    if (!session.video_code) {
      console.error('❌ No code generated for this session (stored code is NULL)');
      return res.status(400).json({ error: 'No video code generated for this session' });
    }

    // Check expiry - convert ISO timestamp to Unix milliseconds
    if (session.video_code_expires_at) {
      // video_code_expires_at is stored as TIMESTAMP WITH TIME ZONE (always UTC)
      // Convert to Date object which will handle timezone correctly from UTC
      const expiryDate = new Date(String(session.video_code_expires_at));
      const expiryMs = expiryDate.getTime();
      const timeRemainingMs = expiryMs - nowMs;

      console.log('⏳ Checking expiry:', {
        expiryMs,
        nowMs,
        timeRemainingMs,
        expired: timeRemainingMs <= 0
      });

      if (timeRemainingMs <= 0) {
        console.warn(`⚠️ Code has expired! (${Math.abs(timeRemainingMs)}ms ago)`);
        return res.status(400).json({ error: 'Video code has expired' });
      }
      console.log(`✅ Code is still valid (${timeRemainingMs}ms remaining)`);
    }

    // Compare codes
    const storedCode = String(session.video_code).trim();
    const providedCode = String(code).trim();

    console.log('🔎 Code comparison:', {
      stored: storedCode,
      provided: providedCode,
      match: storedCode === providedCode
    });

    if (storedCode !== providedCode) {
      console.error(`❌ Code mismatch!`);
      console.error(`   Stored: "${storedCode}"`);
      console.error(`   Provided: "${providedCode}"`);
      return res.status(400).json({ error: 'Invalid video code' });
    }

    // Code is valid - clear it
    console.log('⏳ Clearing code from database...');
    await query(
      'UPDATE sessions SET video_code = NULL, video_code_expires_at = NULL WHERE id = $1',
      [sessionId]
    );
    console.log('✅ Code cleared from database');

    console.log('✅ VERIFICATION SUCCESSFUL\n');

    // Emit socket event to notify both users that code verification succeeded
    if (io) {
      console.log(`📡 Emitting video:code-verified event for session ${sessionId}`);
      io.to(`session:${sessionId}`).emit('video:code-verified', {
        sessionId,
        timestamp: Date.now(),
      });
    }

    res.json({
      success: true,
      message: 'Video code verified successfully',
    });
  } catch (err) {
    console.error('❌ Verify code error:', err);
    res.status(500).json({
      error: 'Failed to verify video code',
      details: err instanceof Error ? err.message : String(err)
    });
  }
});

export default router;