-- Migration: mentor-controlled opt-in toggle for code-editor activity recording
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recording_enabled BOOLEAN NOT NULL DEFAULT FALSE;
