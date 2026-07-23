-- Optional SSH login name (default root). Run once in Supabase SQL Editor.

ALTER TABLE servers
  ADD COLUMN IF NOT EXISTS ssh_username text DEFAULT 'root';

COMMENT ON COLUMN servers.ssh_username IS 'SSH login user (root, ubuntu, …). Install scripts use sudo -n when not root.';

NOTIFY pgrst, 'reload schema';
