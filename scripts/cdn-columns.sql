-- Yandex Cloud CDN path columns (on exit server row)
-- Run in Supabase SQL Editor once (after relay-columns.sql is fine).

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_status text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_domain text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_origin_domain text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_relay_domain text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_uuid text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_path text DEFAULT '/api-test';

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_padding_key text DEFAULT 'dc';

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_email text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_origin_ip text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_origin_ssh_port integer DEFAULT 22;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_origin_ssh_username text DEFAULT 'root';

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_origin_ssh_password text;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_exit_listen_port integer DEFAULT 11443;

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS cdn_vless_config_url text;

COMMENT ON COLUMN servers.cdn_status IS 'pending | installing_exit | installing_origin | ready | error';
COMMENT ON COLUMN servers.cdn_domain IS 'Client CDN host, e.g. cdn.example.com';
COMMENT ON COLUMN servers.cdn_origin_domain IS 'Origin host for Yandex CDN, e.g. origin.example.com';
COMMENT ON COLUMN servers.cdn_relay_domain IS 'Exit TLS SNI host, e.g. relay.example.com';
COMMENT ON COLUMN servers.cdn_vless_config_url IS 'Client VLESS URL via Yandex CDN';
COMMENT ON COLUMN servers.cdn_exit_listen_port IS 'Exit inbound for Origin→Exit (default 11443; avoids RU relay 10443)';

NOTIFY pgrst, 'reload schema';
