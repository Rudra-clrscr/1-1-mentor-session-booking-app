-- Migration: recurring session bookings
CREATE TABLE IF NOT EXISTS recurring_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  topic VARCHAR(255),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  occurrences INT NOT NULL,
  duration_minutes INT DEFAULT 60,
  language VARCHAR(50) DEFAULT 'javascript',
  code_language VARCHAR(50),
  recording_enabled BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  cancelled_by UUID REFERENCES users(id),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS recurring_series_id UUID REFERENCES recurring_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_index INT;

CREATE INDEX IF NOT EXISTS idx_recurring_series_mentor_id ON recurring_series(mentor_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_student_id ON recurring_series(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_recurring_series_id ON sessions(recurring_series_id);
