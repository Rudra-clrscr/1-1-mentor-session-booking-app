-- Migration: Add reminder flag columns to sessions table
-- Run this once against your Neon/PostgreSQL database

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS reminder_sent_30m  BOOLEAN NOT NULL DEFAULT FALSE;

-- Index to make the cron query fast (only scans scheduled sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_reminder
  ON sessions (status, scheduled_at, reminder_sent_24h, reminder_sent_30m)
  WHERE status = 'scheduled';
