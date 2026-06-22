-- Migration: support file/image attachments on chat messages
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS attachment JSONB;
