import { Router, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { query, queryOne, transaction } from '@/database';
import authMiddleware, { AuthRequest } from '@/middleware/auth';
import { requireRole } from '@/middleware/requireRole';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '@/services/emailService';
import { mentorAvailabilityRoom } from '@/socket/handlers/mentorAvailability';

const router = Router();

let io: SocketIOServer | null = null;
export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

const FREQUENCIES = ['weekly', 'biweekly', 'monthly'] as const;
type Frequency = (typeof FREQUENCIES)[number];
const MIN_OCCURRENCES = 2;
const MAX_OCCURRENCES = 24;

// `sessions.scheduled_at` is TIMESTAMP WITHOUT TIME ZONE; pg parses it back
// assuming the server's local zone, shifting it relative to the literal
// value that was written. Re-anchor it to UTC using its local components so
// it lines up with the true-UTC Date objects built from request input.
function dbTimestampToUtcMs(value: Date): number {
  return Date.UTC(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    value.getHours(),
    value.getMinutes(),
    value.getSeconds(),
    value.getMilliseconds()
  );
}

function nextOccurrence(date: Date, frequency: Frequency): Date {
  const next = new Date(date);
  if (frequency === 'weekly') {
    next.setDate(next.getDate() + 7);
  } else if (frequency === 'biweekly') {
    next.setDate(next.getDate() + 14);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

// Create a recurring session series (mentor only)
router.post('/', authMiddleware, requireRole('mentor'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      description,
      topic,
      scheduled_at,
      duration_minutes,
      language,
      code_language,
      recording_enabled,
      frequency,
      occurrences,
    } = req.body;

    if (!title || !scheduled_at) {
      return res.status(400).json({ error: 'title and scheduled_at are required' });
    }

    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ error: `frequency must be one of: ${FREQUENCIES.join(', ')}` });
    }

    const occurrenceCount = parseInt(occurrences, 10);
    if (!Number.isInteger(occurrenceCount) || occurrenceCount < MIN_OCCURRENCES || occurrenceCount > MAX_OCCURRENCES) {
      return res.status(400).json({
        error: `occurrences must be an integer between ${MIN_OCCURRENCES} and ${MAX_OCCURRENCES}`,
      });
    }

    const mentorId = req.user!.id;
    const durationMinutes = duration_minutes || 60;
    const seriesId = uuidv4();
    const now = new Date().toISOString();

    // Build candidate dates for every occurrence up front
    const candidateDates: Date[] = [];
    let cursor = new Date(scheduled_at);
    for (let i = 0; i < occurrenceCount; i++) {
      candidateDates.push(new Date(cursor));
      cursor = nextOccurrence(cursor, frequency as Frequency);
    }

    // Conflict detection: skip any candidate slot that overlaps an existing,
    // non-cancelled session already on this mentor's calendar.
    const existing = await query<{ scheduled_at: string; duration_minutes: number }>(
      `SELECT scheduled_at, duration_minutes FROM sessions
       WHERE mentor_id = $1 AND status != 'cancelled' AND scheduled_at IS NOT NULL`,
      [mentorId]
    );
    const existingRanges = existing.rows.map((s) => {
      const start = dbTimestampToUtcMs(new Date(s.scheduled_at));
      const end = start + (s.duration_minutes || 60) * 60 * 1000;
      return { start, end };
    });

    const created: any[] = [];
    const skipped: string[] = [];

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO recurring_series
           (id, mentor_id, title, description, topic, frequency, occurrences, duration_minutes, language, code_language, recording_enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          seriesId,
          mentorId,
          title,
          description,
          topic,
          frequency,
          occurrenceCount,
          durationMinutes,
          language || 'javascript',
          code_language || 'javascript',
          recording_enabled === true,
          now,
          now,
        ]
      );

      let recurrenceIndex = 0;
      for (const date of candidateDates) {
        const start = date.getTime();
        const end = start + durationMinutes * 60 * 1000;
        const conflicts = existingRanges.some((r) => start < r.end && end > r.start);

        if (conflicts) {
          skipped.push(date.toISOString());
          continue;
        }

        recurrenceIndex += 1;
        const sessionId = uuidv4();
        await client.query(
          `INSERT INTO sessions
             (id, mentor_id, title, description, topic, status, scheduled_at, duration_minutes, language, code_language, recording_enabled, recurring_series_id, recurrence_index, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            sessionId,
            mentorId,
            title,
            description,
            topic,
            date.toISOString(),
            durationMinutes,
            language || 'javascript',
            code_language || 'javascript',
            recording_enabled === true,
            seriesId,
            recurrenceIndex,
            now,
            now,
          ]
        );
        // Reserve this slot against future candidates in the same series too
        existingRanges.push({ start, end });
        const insertedRow = await client.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
        created.push(insertedRow.rows[0]);
      }
    });

    const series = await queryOne('SELECT * FROM recurring_series WHERE id = $1', [seriesId]);

    res.json({
      success: true,
      data: { series, sessions: created, skipped },
    });
  } catch (err) {
    console.error('Create recurring series error:', err);
    res.status(500).json({ error: 'Failed to create recurring session series' });
  }
});

// Get a series and its sessions (participants only)
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const series = await queryOne('SELECT * FROM recurring_series WHERE id = $1', [req.params.id]);
    if (!series) {
      return res.status(404).json({ error: 'Recurring series not found' });
    }

    if (series.mentor_id !== req.user?.id && series.student_id !== req.user?.id) {
      return res.status(403).json({ error: 'Unauthorized to view this series' });
    }

    const sessions = await query(
      'SELECT * FROM sessions WHERE recurring_series_id = $1 ORDER BY recurrence_index ASC',
      [req.params.id]
    );

    res.json({
      success: true,
      data: { series, sessions: sessions.rows },
    });
  } catch (err) {
    console.error('Get recurring series error:', err);
    res.status(500).json({ error: 'Failed to get recurring series' });
  }
});

// Cancel an entire recurring series (mentor or the enrolled student)
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const { reason } = req.body as { reason?: string };

  try {
    const series = await queryOne('SELECT * FROM recurring_series WHERE id = $1', [id]);
    if (!series) {
      return res.status(404).json({ error: 'Recurring series not found' });
    }

    if (series.mentor_id !== userId && series.student_id !== userId) {
      return res.status(403).json({ error: 'You are not a participant in this series' });
    }

    if (series.status === 'cancelled') {
      return res.status(400).json({ error: 'This series is already cancelled' });
    }

    const now = new Date().toISOString();

    await transaction(async (client) => {
      await client.query(
        `UPDATE recurring_series
         SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2, cancelled_at = $3, updated_at = $4
         WHERE id = $5`,
        [userId, reason ?? null, now, now, id]
      );

      // Only future, not-yet-started occurrences are cancelled — history is preserved.
      await client.query(
        `UPDATE sessions
         SET status = 'cancelled', cancelled_by = $1, cancellation_reason = $2, cancelled_at = $3, updated_at = $4
         WHERE recurring_series_id = $5 AND status = 'scheduled'`,
        [userId, reason ?? null, now, now, id]
      );
    });

    const participantIds = [series.mentor_id, series.student_id].filter(Boolean) as string[];
    if (participantIds.length > 0) {
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
          `Recurring Sessions Cancelled: "${series.title as string}"`,
          buildSeriesCancellationEmailHTML({
            recipientName: p.name,
            cancellerName,
            seriesTitle: series.title as string,
            reason,
          })
        );
      }
    }

    if (io) {
      const payload = { seriesId: id, cancelledBy: userId, reason: reason ?? null };
      if (series.mentor_id) io.to(series.mentor_id as string).emit('series:cancelled', payload as any);
      if (series.student_id) io.to(series.student_id as string).emit('series:cancelled', payload as any);

      // Frees up every future occurrence's slot — tell anyone watching the
      // mentor's profile so it doesn't show stale "booked" state.
      if (series.mentor_id) {
        io.to(mentorAvailabilityRoom(series.mentor_id as string)).emit('mentor:availability-changed', {
          mentorId: series.mentor_id,
        });
      }
    }

    return res.json({
      success: true,
      data: { seriesId: id, status: 'cancelled', cancelledBy: userId, cancelledAt: now },
    });
  } catch (err) {
    console.error('Cancel recurring series error:', err);
    return res.status(500).json({ error: 'Failed to cancel recurring series' });
  }
});

function buildSeriesCancellationEmailHTML(params: {
  recipientName: string;
  cancellerName: string;
  seriesTitle: string;
  reason?: string;
}): string {
  const { recipientName, cancellerName, seriesTitle, reason } = params;
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Recurring Sessions Cancelled</title>
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
      <div class="hdr"><h1>🔁❌ Recurring Sessions Cancelled</h1></div>
      <div class="body">
        <p style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Hello, ${recipientName}!</p>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">
          <strong style="color:#e2e8f0">${cancellerName}</strong> has cancelled the entire recurring series:
        </p>
        <div class="sc">
          <div class="lbl">Series</div>
          <div class="val">${seriesTitle}</div>
          ${reason ? `<div class="lbl">Reason</div><div class="val">${reason}</div>` : ''}
        </div>
        <p style="color:#64748b;font-size:13px;text-align:center">
          All upcoming occurrences of this series have been cancelled. Already-completed sessions are unaffected.
        </p>
      </div>
      <div class="ftr"><p>© ${new Date().getFullYear()} MentorConnect. All rights reserved.</p></div>
    </div>
  </div>
</body>
</html>`.trim();
}

export default router;
