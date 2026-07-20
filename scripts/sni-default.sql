-- Run in Supabase SQL Editor: set default SNI to www.apple.com
ALTER TABLE servers
  ALTER COLUMN sni_domain SET DEFAULT 'www.apple.com';

UPDATE servers
SET sni_domain = 'www.apple.com'
WHERE sni_domain IS NULL OR sni_domain = 'www.microsoft.com';
