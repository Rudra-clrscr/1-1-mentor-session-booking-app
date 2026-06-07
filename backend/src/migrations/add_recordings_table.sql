-- Create session_recordings table
CREATE TABLE IF NOT EXISTS session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  file_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  duration INTEGER,
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'processing' CHECK (status IN ('recording', 'processing', 'ready', 'failed')),
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recordings_session_id ON session_recordings(session_id);
CREATE INDEX idx_recordings_status ON session_recordings(status);
