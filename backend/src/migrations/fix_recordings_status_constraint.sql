-- Drop the old constraint if it exists (automatically named by Postgres as session_recordings_status_check)
ALTER TABLE session_recordings DROP CONSTRAINT IF EXISTS session_recordings_status_check;

-- Add the updated check constraint
ALTER TABLE session_recordings ADD CONSTRAINT session_recordings_status_check CHECK (status IN ('recording', 'processing', 'ready', 'failed'));
