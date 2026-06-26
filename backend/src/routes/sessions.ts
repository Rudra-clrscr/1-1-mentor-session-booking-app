import { Router, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { query, queryOne, transaction } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { requireRole } from '@/middleware/requireRole';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '@/services/emailService';
import { resolveJoinDecision } from '@/utils/sessionBooking';
import { mentorAvailabilityRoom } from '@/socket/handlers/mentorAvailability';

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
    const { title, description, topic, scheduled_at, duration_minutes, language, code_language, recording_enabled } =
      req.body;

    const sessionId = uuidv4();
    const now = new Date().toISOString();
    // Use provided scheduled_at or default to now if not provided
    const sessionScheduledAt = scheduled_at || now;

    await query(
      `INSERT INTO sessions (id, mentor_id, title, description, topic, status, scheduled_at, duration_minutes, language, code_language, recording_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9, $10, $11, $12)`,
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
        recording_enabled === true,
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

    const { session: sessionData, justBooked } = await transaction(async (client) => {
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

      const decision = resolveJoinDecision(session, studentId as string);

      if (decision.action === 'reject') {
        throw new HttpError(decision.status, decision.error);
      }

      if (decision.action === 'noop') {
        return { session, justBooked: false };
      }

      await client.query(
        'UPDATE sessions SET student_id = $1, status = $2, started_at = $3, updated_at = $4 WHERE id = $5',
        [studentId, 'in_progress', now, now, req.params.id]
      );

      // If this occurrence belongs to a recurring series, claim every other
      // unclaimed future occurrence in the series for this same student too —
      // that's the whole point of recurring booking: one join, not one per slot.
      if (session.recurring_series_id) {
        await client.query(
          `UPDATE sessions SET student_id = $1, updated_at = $2
           WHERE recurring_series_id = $3 AND student_id IS NULL AND status = 'scheduled'`,
          [studentId, now, session.recurring_series_id]
        );
        await client.query(
          `UPDATE recurring_series SET student_id = $1, updated_at = $2 WHERE id = $3 AND student_id IS NULL`,
          [studentId, now, session.recurring_series_id]
        );
      }

      const updated = await client.query('SELECT * FROM sessions WHERE id = $1', [req.params.id]);
      return { session: updated.rows[0], justBooked: true };
    });

    // Send booking confirmation emails to both participants once, on the actual booking
    // transition (not on idempotent re-joins of an already-booked session).
    if (justBooked) {
      const participants = await query(
        `SELECT id, name, email, email_notifications_enabled FROM users WHERE id = ANY($1::uuid[])`,
        [[sessionData.mentor_id, sessionData.student_id]]
      );
      const joinLink = `${process.env.CLIENT_URL}/session/${sessionData.id}`;
      for (const p of participants.rows as { id: string; name: string; email: string; email_notifications_enabled: boolean }[]) {
        if (p.email_notifications_enabled === false) continue;
        const otherParty = participants.rows.find((u: any) => u.id !== p.id);
        await sendEmail(
          p.email,
          `Session Confirmed: "${sessionData.title as string}"`,
          buildBookingConfirmationEmailHTML({
            recipientName: p.name,
            otherPartyName: otherParty?.name ?? 'Your session partner',
            sessionTitle: sessionData.title as string,
            sessionTopic: sessionData.topic as string | undefined,
            scheduledAt: sessionData.scheduled_at as string | undefined,
            joinLink,
          })
        );
      }

      // Notify anyone currently viewing this mentor's profile that the slot
      // they're looking at is gone, so they don't need to reload to see it.
      if (io) {
        io.to(mentorAvailabilityRoom(sessionData.mentor_id as string)).emit('mentor:availability-changed', {
          mentorId: sessionData.mentor_id,
        });
      }
    }

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

    // Notify participants the session ended and invite feedback (best-effort, opt-out respected)
    const participantIds = [session.mentor_id, session.student_id].filter(Boolean) as string[];
    const participants = await query(
      `SELECT id, name, email, email_notifications_enabled FROM users WHERE id = ANY($1::uuid[])`,
      [participantIds]
    );
    const feedbackLink = `${process.env.CLIENT_URL}/sessions/history/${req.params.id}`;
    for (const p of participants.rows as { id: string; name: string; email: string; email_notifications_enabled: boolean }[]) {
      if (p.email_notifications_enabled === false) continue;
      const otherParty = participants.rows.find((u: any) => u.id !== p.id);
      await sendEmail(
        p.email,
        `Session Completed: "${session.title as string}"`,
        buildSessionEndedEmailHTML({
          recipientName: p.name,
          otherPartyName: otherParty?.name ?? 'your session partner',
          sessionTitle: session.title as string,
          feedbackLink,
        })
      );
    }

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

function buildCancellationEmailHTML(params: {
  recipientName: string;
  cancellerName: string;
  sessionTitle: string;
  reason?: string;
}): string {
  const { recipientName, cancellerName, sessionTitle, reason } = params;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Session Cancelled</title>
  <style>
    body{margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0}
    .wrap{max-width:600px;margin:0 auto;padding:32px 16px}
    .card{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(239,68,68,.3);overflow:hidden}
    .hdr{background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:32px 40px;text-align:center}
    .hdr h1{margin:0;font-size:24px;color:#fff;font-weight:700}
    .body{padding:32px 40px}
    .sc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px 24px;margin:20px 0}
    .lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#ef4444;font-weight:600;margin-bottom:4px}
    .val{font-size:15px;color:#f1f5f9;margin-bottom:14px}
    .val:last-child{margin-bottom:0}
    .ftr{text-align:center;padding:20px 40px;font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,.05)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr"><h1>❌ Session Cancelled</h1></div>
      <div class="body">
        <p style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Hello, ${recipientName}!</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">
          <strong style="color:#e2e8f0">${cancellerName}</strong> has cancelled the following session:
        </p>
        <div class="sc">
          <div class="lbl">Session</div>
          <div class="val">${sessionTitle}</div>
          ${reason ? `<div class="lbl">Reason</div><div class="val">${reason}</div>` : ''}
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center">
          Both participants have been notified. You can browse other sessions from your dashboard.
        </p>
      </div>
      <div class="ftr"><p>© ${new Date().getFullYear()} MentorConnect. All rights reserved.</p></div>
    </div>
  </div>
</body>
</html>`.trim();
}

function buildBookingConfirmationEmailHTML(params: {
  recipientName: string;
  otherPartyName: string;
  sessionTitle: string;
  sessionTopic?: string;
  scheduledAt?: string;
  joinLink: string;
}): string {
  const { recipientName, otherPartyName, sessionTitle, sessionTopic, scheduledAt, joinLink } = params;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Session Confirmed</title>
  <style>
    body{margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0}
    .wrap{max-width:600px;margin:0 auto;padding:32px 16px}
    .card{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(34,197,94,.3);overflow:hidden}
    .hdr{background:linear-gradient(135deg,#16a34a 0%,#15803d 100%);padding:32px 40px;text-align:center}
    .hdr h1{margin:0;font-size:24px;color:#fff;font-weight:700}
    .body{padding:32px 40px}
    .sc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px 24px;margin:20px 0}
    .lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#22c55e;font-weight:600;margin-bottom:4px}
    .val{font-size:15px;color:#f1f5f9;margin-bottom:14px}
    .val:last-child{margin-bottom:0}
    .btn{display:block;width:fit-content;margin:28px auto;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-align:center}
    .ftr{text-align:center;padding:20px 40px;font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,.05)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr"><h1>✅ Session Confirmed</h1></div>
      <div class="body">
        <p style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Hello, ${recipientName}!</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">
          Your session with <strong style="color:#e2e8f0">${otherPartyName}</strong> is booked.
        </p>
        <div class="sc">
          <div class="lbl">Session</div>
          <div class="val">${sessionTitle}</div>
          ${sessionTopic ? `<div class="lbl">Topic</div><div class="val">${sessionTopic}</div>` : ''}
          ${scheduledAt ? `<div class="lbl">Scheduled Time</div><div class="val">${new Date(scheduledAt).toLocaleString()}</div>` : ''}
        </div>
        <a href="${joinLink}" class="btn">🚀 View Session</a>
      </div>
      <div class="ftr"><p>© ${new Date().getFullYear()} MentorConnect. All rights reserved.</p></div>
    </div>
  </div>
</body>
</html>`.trim();
}

function buildSessionEndedEmailHTML(params: {
  recipientName: string;
  otherPartyName: string;
  sessionTitle: string;
  feedbackLink: string;
}): string {
  const { recipientName, otherPartyName, sessionTitle, feedbackLink } = params;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Session Completed</title>
  <style>
    body{margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0}
    .wrap{max-width:600px;margin:0 auto;padding:32px 16px}
    .card{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(139,92,246,.3);overflow:hidden}
    .hdr{background:linear-gradient(135deg,#8B5CF6 0%,#6D28D9 100%);padding:32px 40px;text-align:center}
    .hdr h1{margin:0;font-size:24px;color:#fff;font-weight:700}
    .body{padding:32px 40px}
    .sc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px 24px;margin:20px 0}
    .lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8B5CF6;font-weight:600;margin-bottom:4px}
    .val{font-size:15px;color:#f1f5f9;margin-bottom:14px}
    .val:last-child{margin-bottom:0}
    .btn{display:block;width:fit-content;margin:28px auto;background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-align:center}
    .ftr{text-align:center;padding:20px 40px;font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,.05)}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr"><h1>🎉 Session Completed</h1></div>
      <div class="body">
        <p style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Hello, ${recipientName}!</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">
          Your session with <strong style="color:#e2e8f0">${otherPartyName}</strong> has ended.
        </p>
        <div class="sc">
          <div class="lbl">Session</div>
          <div class="val">${sessionTitle}</div>
        </div>
        <a href="${feedbackLink}" class="btn">⭐ Leave Feedback</a>
      </div>
      <div class="ftr"><p>© ${new Date().getFullYear()} MentorConnect. All rights reserved.</p></div>
    </div>
  </div>
</body>
</html>`.trim();
}

// Cancel session (mentor or student who is a participant)
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { reason } = req.body as { reason?: string };
  const minNoticeHours = parseInt(process.env.MIN_CANCEL_NOTICE_HOURS ?? '2', 10);

  try {
    const session = await queryOne(
      `SELECT id, mentor_id, student_id, status, scheduled_at, title FROM sessions WHERE id = $1`,
      [id]
    );

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.mentor_id !== userId && session.student_id !== userId) {
      return res.status(403).json({ error: 'You are not a participant in this session' });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({
        error: `Cannot cancel a session with status '${session.status}'`,
      });
    }

    if (session.scheduled_at) {
      const hoursUntil =
        (new Date(session.scheduled_at as string).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntil < minNoticeHours) {
        return res.status(400).json({
          error: `Sessions must be cancelled at least ${minNoticeHours} hours before they start`,
        });
      }
    }

    const now = new Date().toISOString();
    await query(
      `UPDATE sessions
       SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2,
           cancelled_at = $3, updated_at = $4
       WHERE id = $5`,
      [userId, reason ?? null, now, now, id]
    );

    // Fetch participants for email notifications
    const participantIds = [session.mentor_id, session.student_id].filter(Boolean) as string[];
    const usersRes = await query(
      `SELECT id, name, email, email_notifications_enabled FROM users WHERE id = ANY($1::uuid[])`,
      [participantIds]
    );
    const participants = usersRes.rows as { id: string; name: string; email: string; email_notifications_enabled: boolean }[];
    const cancellerName = participants.find((p) => p.id === userId)?.name ?? 'A participant';

    for (const p of participants) {
      if (p.email_notifications_enabled === false) continue;
      await sendEmail(
        p.email,
        `Session Cancelled: "${session.title as string}"`,
        buildCancellationEmailHTML({
          recipientName: p.name,
          cancellerName,
          sessionTitle: session.title as string,
          reason,
        })
      );
    }

    // Emit socket events to both participants and the session room
    if (io) {
      const payload = { sessionId: id, cancelledBy: userId, reason: reason ?? null };
      if (session.mentor_id) io.to(session.mentor_id as string).emit('session:cancelled', payload);
      if (session.student_id) io.to(session.student_id as string).emit('session:cancelled', payload);
      io.to(`session:${id}`).emit('session:cancelled', payload);

      // Cancelling frees up this mentor's slot again — tell anyone watching
      // the mentor's profile so it doesn't show stale "booked" state.
      io.to(mentorAvailabilityRoom(session.mentor_id as string)).emit('mentor:availability-changed', {
        mentorId: session.mentor_id,
      });
    }

    return res.status(200).json({
      success: true,
      data: { sessionId: id, status: 'cancelled', cancelledBy: userId, cancelledAt: now },
    });
  } catch (err) {
    console.error('Cancel session error:', err);
    return res.status(500).json({ error: 'Failed to cancel session' });
  }
});

export default router;