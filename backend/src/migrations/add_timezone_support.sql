-- Migration: timezone-aware scheduling
-- 1. sessions.scheduled_at/started_at/ended_at were TIMESTAMP WITHOUT TIME ZONE.
--    node-pg reads those back assuming the server's local time zone, which
--    silently shifts every timestamp relative to what was written. Converting
--    to TIMESTAMPTZ (interpreting the existing naive values as UTC, since the
--    app always wrote them via Date#toISOString()) makes the column store and
--    return an unambiguous instant regardless of the reading client's zone.
-- 2. users.timezone records the IANA zone the user is in (auto-detected on
--    the frontend), so mentor availability can be displayed alongside it and
--    a mentor's session times can be shown in their own zone too.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'scheduled_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN scheduled_at TYPE TIMESTAMPTZ USING scheduled_at AT TIME ZONE 'UTC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'started_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN started_at TYPE TIMESTAMPTZ USING started_at AT TIME ZONE 'UTC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ended_at' AND data_type = 'timestamp without time zone'
  ) THEN
    ALTER TABLE sessions ALTER COLUMN ended_at TYPE TIMESTAMPTZ USING ended_at AT TIME ZONE 'UTC';
  END IF;
END $$;

ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(64) NOT NULL DEFAULT 'UTC';
