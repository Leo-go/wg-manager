-- VLESS Manager v2 — RU Relay columns
-- Run in Supabase SQL Editor once.

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'exit';

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS exit_server_id uuid REFERENCES servers(id) ON DELETE SET NULL;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_vless_config_url text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_listen_port integer DEFAULT 10443;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_uuid text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_public_key text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_short_id text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_path text DEFAULT '/wg-relay';

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS relay_status text;

COMMENT ON COLUMN servers.role IS 'exit (abroad) | relay (RU hop)';
COMMENT ON COLUMN servers.exit_server_id IS 'For role=relay: FK to exit server';
COMMENT ON COLUMN servers.relay_vless_config_url IS 'On exit: client VLESS URL via RU relay';
COMMENT ON COLUMN servers.relay_uuid IS 'On exit: UUID of xHTTP Reality inbound for relays';

-- Reload PostgREST schema cache (run after adding columns)
NOTIFY pgrst, 'reload schema';
