-- Key lifecycle audit for Telegram bot VPN users
-- Run in Supabase SQL Editor (service role only)

CREATE TABLE IF NOT EXISTS bot_key_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id UUID REFERENCES bot_users (id) ON DELETE SET NULL,
  telegram_id BIGINT,
  xray_uuid TEXT,
  host TEXT NOT NULL DEFAULT 'both'
    CHECK (host IN ('origin', 'home', 'both')),
  action TEXT NOT NULL
    CHECK (action IN ('add', 'remove', 'restore', 'revoke', 'provision')),
  ok BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_key_events_telegram_id_created_idx
  ON bot_key_events (telegram_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bot_key_events_bot_user_id_created_idx
  ON bot_key_events (bot_user_id, created_at DESC);

ALTER TABLE bot_key_events ENABLE ROW LEVEL SECURITY;
-- No public policies — only service_role bypasses RLS
