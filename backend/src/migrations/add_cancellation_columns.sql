-- Migration: add cancellation tracking columns to sessions
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_cancelled_by ON sessions(cancelled_by);
