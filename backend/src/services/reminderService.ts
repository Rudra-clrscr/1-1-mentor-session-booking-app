import cron from 'node-cron';
import { query } from '@/database';
import { sendSessionReminderEmail } from '@/services/emailService';
import { createNotification } from '@/routes/notifications';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UpcomingSession {
  id: string;
  title: string;
  topic?: string;
  scheduled_at: Date;
  duration_minutes: number;
  mentor_id: string;
  student_id?: string;
  mentor_name: string;
  mentor_email: string;
  student_name?: string;
  student_email?: string;
  reminder_sent_24h: boolean;
  reminder_sent_30m: boolean;
}

// ─── Helper: Send Both Email + In-App Notification ───────────────────────────

async function dispatchReminder(session: UpcomingSession, minutesBefore: number) {
  const { id, title, topic, scheduled_at, mentor_id, student_id,
          mentor_name, mentor_email, student_name, student_email } = session;

  const scheduledAt = new Date(scheduled_at);
  const timeLabel   = minutesBefore >= 60 ? `${minutesBefore / 60} hour(s)` : `${minutesBefore} minute(s)`;
  const notifTitle  = `⏰ Session in ${timeLabel}`;
  const notifMsg    = `Your session "${title}" starts in ${timeLabel}.`;

  console.log(`📨 [REMINDER] Dispatching ${minutesBefore}min reminder for session ${id} — "${title}"`);

  // ── Mentor ──────────────────────────────────────────────────────────────────
  if (mentor_email) {
    await sendSessionReminderEmail({
      recipientEmail: mentor_email,
      recipientName:  mentor_name || 'Mentor',
      otherPartyName: student_name || 'Student',
      sessionId:      id,
      sessionTitle:   title,
      sessionTopic:   topic,
      scheduledAt,
      minutesBefore,
      role: 'mentor',
    });
  }
  await createNotification(mentor_id, 'session_reminder', notifTitle, notifMsg, id);

  // ── Student (only if session has a student joined) ─────────────────────────
  if (student_id) {
    if (student_email) {
      await sendSessionReminderEmail({
        recipientEmail: student_email,
        recipientName:  student_name || 'Student',
        otherPartyName: mentor_name || 'Mentor',
        sessionId:      id,
        sessionTitle:   title,
        sessionTopic:   topic,
        scheduledAt,
        minutesBefore,
        role: 'student',
      });
    }
    await createNotification(student_id, 'session_reminder', notifTitle, notifMsg, id);
  }
}

// ─── 24-Hour Reminder Check ───────────────────────────────────────────────────

async function check24hReminders() {
  try {
    const result = await query<UpcomingSession>(`
      SELECT
        s.id, s.title, s.topic, s.scheduled_at, s.duration_minutes,
        s.mentor_id, s.student_id,
        s.reminder_sent_24h, s.reminder_sent_30m,
        m.name  AS mentor_name,  m.email  AS mentor_email,
        st.name AS student_name, st.email AS student_email
      FROM sessions s
      JOIN users m  ON m.id  = s.mentor_id
      LEFT JOIN users st ON st.id = s.student_id
      WHERE
        s.status = 'scheduled'
        AND s.reminder_sent_24h = FALSE
        AND s.scheduled_at BETWEEN NOW() + INTERVAL '23 hours 55 minutes'
                                AND NOW() + INTERVAL '24 hours 5 minutes'
    `);

    const sessions = result.rows;
    if (sessions.length === 0) return;

    console.log(`🔔 [REMINDER-24H] Found ${sessions.length} session(s) to remind`);

    for (const session of sessions) {
      await dispatchReminder(session, 1440);

      // Mark flag so we never send again
      await query(
        'UPDATE sessions SET reminder_sent_24h = TRUE WHERE id = $1',
        [session.id]
      );
    }
  } catch (err) {
    console.error('❌ [REMINDER-24H] Error in 24h check:', err);
  }
}

// ─── 30-Minute Reminder Check ─────────────────────────────────────────────────

async function check30mReminders() {
  try {
    const result = await query<UpcomingSession>(`
      SELECT
        s.id, s.title, s.topic, s.scheduled_at, s.duration_minutes,
        s.mentor_id, s.student_id,
        s.reminder_sent_24h, s.reminder_sent_30m,
        m.name  AS mentor_name,  m.email  AS mentor_email,
        st.name AS student_name, st.email AS student_email
      FROM sessions s
      JOIN users m  ON m.id  = s.mentor_id
      LEFT JOIN users st ON st.id = s.student_id
      WHERE
        s.status = 'scheduled'
        AND s.reminder_sent_30m = FALSE
        AND s.scheduled_at BETWEEN NOW() + INTERVAL '25 minutes'
                                AND NOW() + INTERVAL '35 minutes'
    `);

    const sessions = result.rows;
    if (sessions.length === 0) return;

    console.log(`🔔 [REMINDER-30M] Found ${sessions.length} session(s) to remind`);

    for (const session of sessions) {
      await dispatchReminder(session, 30);

      await query(
        'UPDATE sessions SET reminder_sent_30m = TRUE WHERE id = $1',
        [session.id]
      );
    }
  } catch (err) {
    console.error('❌ [REMINDER-30M] Error in 30m check:', err);
  }
}

// ─── Start Cron ───────────────────────────────────────────────────────────────

/**
 * Call this once when the server boots.
 * Schedules two cron jobs:
 *   - Every minute: check for 30-minute reminders
 *   - Every minute: check for 24-hour reminders
 */
export function startReminderService() {
  console.log('⏰ [REMINDER] Starting session reminder cron service...');

  // Runs every minute
  cron.schedule('* * * * *', async () => {
    await check24hReminders();
    await check30mReminders();
  });

  console.log('✅ [REMINDER] Reminder service started — checking every minute');
}
