-- Optional columns for Timeweb (and other) automated provisioning.
-- Run in Supabase SQL Editor once.

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS provider text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS provider_server_id text;

COMMENT ON COLUMN servers.provider IS 'manual | timeweb | …';
COMMENT ON COLUMN servers.provider_server_id IS 'External provider resource id';
