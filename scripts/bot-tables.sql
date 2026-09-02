-- Telegram bot tables for shared VPN (friends & family)
-- Run in Supabase SQL Editor

-- Bot users (linked to Telegram, not Supabase Auth)
CREATE TABLE IF NOT EXISTS bot_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  telegram_username TEXT,
  first_name TEXT,
  last_name TEXT,
  xray_uuid UUID,
  vless_config_url TEXT,
  vless_tcp_config_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subscribed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bot_users_telegram_id_idx ON bot_users (telegram_id);
CREATE INDEX IF NOT EXISTS bot_users_subscribed_until_idx ON bot_users (subscribed_until);

-- Donations (manual confirmation in MVP)
CREATE TABLE IF NOT EXISTS donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id UUID NOT NULL REFERENCES bot_users (id) ON DELETE CASCADE,
  amount_rub INTEGER NOT NULL CHECK (amount_rub > 0),
  month TEXT NOT NULL, -- YYYY-MM
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  note TEXT,
  confirmed_by BIGINT, -- admin telegram_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donations_month_status_idx ON donations (month, status);
CREATE INDEX IF NOT EXISTS donations_bot_user_id_idx ON donations (bot_user_id);

-- Monthly fundraising goals
CREATE TABLE IF NOT EXISTS monthly_goals (
  month TEXT PRIMARY KEY, -- YYYY-MM
  target_rub INTEGER NOT NULL CHECK (target_rub > 0),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION bot_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bot_users_updated_at ON bot_users;
CREATE TRIGGER bot_users_updated_at
  BEFORE UPDATE ON bot_users
  FOR EACH ROW EXECUTE FUNCTION bot_set_updated_at();

DROP TRIGGER IF EXISTS donations_updated_at ON donations;
CREATE TRIGGER donations_updated_at
  BEFORE UPDATE ON donations
  FOR EACH ROW EXECUTE FUNCTION bot_set_updated_at();

DROP TRIGGER IF EXISTS monthly_goals_updated_at ON monthly_goals;
CREATE TRIGGER monthly_goals_updated_at
  BEFORE UPDATE ON monthly_goals
  FOR EACH ROW EXECUTE FUNCTION bot_set_updated_at();

-- RLS: service role only (bot API uses service role key)
ALTER TABLE bot_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role bypasses RLS
