import nodemailer from 'nodemailer';
import { config } from '@/config';
import { formatSessionTime } from '@/utils/formatSessionTime';

// ─── Transporter ─────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    host: config.EMAIL_HOST,       // smtp.gmail.com
    port: config.EMAIL_PORT,       // 587
    secure: config.EMAIL_PORT === 465,
    auth: {
      user: config.EMAIL_USER,     // your Gmail address
      pass: config.EMAIL_PASS,     // your Gmail App Password
    },
  });
}

// ─── Core Send Function ───────────────────────────────────────────────────────

/**
 * Send a plain email.
 * Returns true on success, false on failure (never throws).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!config.EMAIL_USER || !config.EMAIL_PASS) {
    console.warn('⚠️ [EMAIL] Email credentials not configured — skipping send.');
    return false;
  }

  try {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: `"MentorConnect" <${config.EMAIL_FROM || config.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`✅ [EMAIL] Sent to ${to} | id: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`❌ [EMAIL] Failed to send to ${to}:`, err);
    return false;
  }
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function buildReminderEmailHTML(params: {
  recipientName: string;
  otherPartyName: string;
  sessionTitle: string;
  sessionTopic?: string;
  scheduledAt: Date;
  recipientTimezone?: string;
  minutesBefore: number;
  joinLink: string;
  role: 'mentor' | 'student';
}): string {
  const { recipientName, otherPartyName, sessionTitle, sessionTopic, scheduledAt, recipientTimezone, minutesBefore, joinLink, role } =
    params;

  const timeLabel   = minutesBefore >= 60 ? `${minutesBefore / 60} hour(s)` : `${minutesBefore} minute(s)`;
  const urgencyColor = minutesBefore <= 30 ? '#ef4444' : '#8B5CF6';
  const urgencyEmoji = minutesBefore <= 30 ? '🔔' : '📅';

  const formattedTime = formatSessionTime(scheduledAt, recipientTimezone);

  const otherLabel = role === 'mentor' ? 'Student' : 'Mentor';
  const tagline    = role === 'student'
    ? 'Your mentor is ready to help you!'
    : 'Your student is looking forward to the session!';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Session Reminder</title>
  <style>
    body{margin:0;padding:0;background:#0f0f13;font-family:'Segoe UI',Arial,sans-serif;color:#e2e8f0}
    .wrap{max-width:600px;margin:0 auto;padding:32px 16px}
    .card{background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);border-radius:16px;border:1px solid rgba(139,92,246,.3);overflow:hidden}
    .hdr{background:linear-gradient(135deg,#8B5CF6 0%,#6D28D9 100%);padding:32px 40px;text-align:center}
    .hdr h1{margin:0;font-size:28px;color:#fff;font-weight:700}
    .hdr p{margin:8px 0 0;color:rgba(255,255,255,.85);font-size:15px}
    .body{padding:32px 40px}
    .badge{display:inline-block;background:${urgencyColor}22;border:1px solid ${urgencyColor};color:${urgencyColor};font-size:14px;font-weight:600;padding:6px 16px;border-radius:999px;margin-bottom:24px}
    .sc{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:20px 24px;margin:20px 0}
    .sc .lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#8B5CF6;font-weight:600;margin-bottom:4px}
    .sc .val{font-size:15px;color:#f1f5f9;margin-bottom:14px}
    .sc .val:last-child{margin-bottom:0}
    .btn{display:block;width:fit-content;margin:28px auto;background:linear-gradient(135deg,#8B5CF6,#6D28D9);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 36px;border-radius:10px;text-align:center}
    .ftr{text-align:center;padding:20px 40px;font-size:12px;color:#64748b;border-top:1px solid rgba(255,255,255,.05)}
    .ftr a{color:#8B5CF6;text-decoration:none}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="hdr">
        <h1>${urgencyEmoji} Session Reminder</h1>
        <p>Your mentoring session is coming up soon!</p>
      </div>
      <div class="body">
        <p style="font-size:18px;font-weight:600;color:#fff;margin-bottom:16px">Hello, ${recipientName}! 👋</p>
        <div class="badge">⏰ Starting in ${timeLabel}</div>
        <p style="color:#94a3b8;font-size:14px;line-height:1.6">
          You have an upcoming session with <strong style="color:#e2e8f0">${otherPartyName}</strong>.
          ${tagline}
        </p>
        <div class="sc">
          <div class="lbl">Session Title</div>
          <div class="val">${sessionTitle}</div>
          ${sessionTopic ? `<div class="lbl">Topic</div><div class="val">${sessionTopic}</div>` : ''}
          <div class="lbl">Scheduled Time</div>
          <div class="val">${formattedTime}</div>
          <div class="lbl">${otherLabel}</div>
          <div class="val">${otherPartyName}</div>
        </div>
        <a href="${joinLink}" class="btn">🚀 Join Session Now</a>
        <p style="color:#64748b;font-size:13px;text-align:center">
          If you can't attend, please notify ${otherPartyName} in advance.
        </p>
      </div>
      <div class="ftr">
        <p>Sent by <a href="${config.CLIENT_URL}">MentorConnect</a></p>
        <p>© ${new Date().getFullYear()} MentorConnect. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`.trim();
}

// ─── Session Reminder Email ───────────────────────────────────────────────────

export async function sendSessionReminderEmail(params: {
  recipientEmail: string;
  recipientName: string;
  otherPartyName: string;
  sessionId: string;
  sessionTitle: string;
  sessionTopic?: string;
  scheduledAt: Date;
  recipientTimezone?: string;
  minutesBefore: number;     // 1440 = 24h, 30 = 30min
  role: 'mentor' | 'student';
}): Promise<boolean> {
  const { recipientEmail, recipientName, otherPartyName, sessionId,
          sessionTitle, sessionTopic, scheduledAt, recipientTimezone, minutesBefore, role } = params;

  const joinLink  = `${config.CLIENT_URL}/session/${sessionId}`;
  const timeLabel = minutesBefore >= 60 ? `${minutesBefore / 60} hour(s)` : `${minutesBefore} minute(s)`;
  const subject   = `⏰ Reminder: "${sessionTitle}" starts in ${timeLabel}`;

  const html = buildReminderEmailHTML({
    recipientName, otherPartyName, sessionTitle, sessionTopic,
    scheduledAt, recipientTimezone, minutesBefore, joinLink, role,
  });

  return sendEmail(recipientEmail, subject, html);
}

// ─── Legacy / Existing Template Sender ───────────────────────────────────────
// Kept for backwards compatibility with existing code that calls sendEmail({ to, subject, template, data })

interface LegacyEmailOptions {
  to: string;
  subject: string;
  template?: string;
  data?: Record<string, any>;
}

const legacyTemplates: Record<string, (data: any) => string> = {
  'session-booked': (d) => `
    <h2>Session Booked Successfully!</h2>
    <p>Hi ${d.studentName},</p>
    <p>Your session with ${d.mentorName} has been confirmed for <strong>${d.sessionTime}</strong>.</p>
    <ul>
      <li>Mentor: ${d.mentorName}</li>
      <li>Date &amp; Time: ${d.sessionTime}</li>
      <li>Duration: ${d.duration} minutes</li>
      <li>Topic: ${d.topic}</li>
    </ul>
    <p><a href="${process.env.CLIENT_URL}/session/${d.sessionId}">Join Session</a></p>
  `,
  'session-reminder': (d) => `
    <h2>Session Reminder</h2>
    <p>Hi ${d.studentName},</p>
    <p>Your session with ${d.mentorName} is coming up in 30 minutes!</p>
    <p><a href="${process.env.CLIENT_URL}/session/${d.sessionId}">Join Now</a></p>
  `,
  'rating-received': (d) => `
    <h2>You Received a New Rating!</h2>
    <p>Hi ${d.mentorName},</p>
    <p>${d.studentName} left you a <strong>${d.rating}⭐</strong> rating after your session.</p>
    <p><strong>Feedback:</strong> "${d.comment || d.review || ''}"</p>
    <p><a href="${process.env.CLIENT_URL}/profile">View Your Profile</a></p>
  `,
  'session-ended': (d) => `
    <h2>Session Completed</h2>
    <p>Hi ${d.studentName},</p>
    <p>Your session with ${d.mentorName} has ended. Please take a moment to leave feedback.</p>
    <p><a href="${process.env.CLIENT_URL}/sessions/history/${d.sessionId}">Leave Feedback</a></p>
  `,
  'welcome': (d) => `
    <h2>Welcome to MentorConnect! 👋</h2>
    <p>Hi ${d.userName},</p>
    <p>Thank you for joining! <a href="${process.env.CLIENT_URL}/dashboard">Go to Dashboard</a></p>
  `,
};

export async function sendBulkEmail(recipients: string[], template: string, data: Record<string, any>) {
  const results = await Promise.all(
    recipients.map((to) => {
      const html = legacyTemplates[template]?.(data) ?? `<p>${data.message ?? ''}</p>`;
      return sendEmail(to, data.subject ?? 'Notification from MentorConnect', html);
    })
  );
  return results.filter(Boolean).length;
}

export async function queueEmail(options: LegacyEmailOptions, _delayMinutes = 0) {
  const html = options.template && legacyTemplates[options.template]
    ? legacyTemplates[options.template](options.data ?? {})
    : `<p>${options.data?.message ?? ''}</p>`;
  return sendEmail(options.to, options.subject, html);
}
