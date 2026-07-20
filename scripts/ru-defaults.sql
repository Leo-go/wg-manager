-- RU-segment optimized defaults for VLESS Reality
ALTER TABLE servers
  ALTER COLUMN sni_domain SET DEFAULT 'www.apple.com';

ALTER TABLE servers
  ALTER COLUMN vless_port SET DEFAULT 2053;

UPDATE servers
SET sni_domain = 'www.apple.com'
WHERE sni_domain IS NULL OR sni_domain = 'www.microsoft.com';

UPDATE servers
SET vless_port = 2053
WHERE vless_port IS NULL OR vless_port = 443;
