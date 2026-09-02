-- Phase 2: reminders, Stars payments, auto-revoke support
-- Run in Supabase SQL Editor after bot-tables.sql

ALTER TABLE bot_users
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bot_users_renewal_reminder_idx
  ON bot_users (subscribed_until)
  WHERE renewal_reminder_sent_at IS NULL;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'manual'
    CHECK (payment_method IN ('manual', 'stars', 'admin'));

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS stars_amount INTEGER;

ALTER TABLE donations
  ADD COLUMN IF NOT EXISTS telegram_payment_charge_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS donations_telegram_charge_uidx
  ON donations (telegram_payment_charge_id)
  WHERE telegram_payment_charge_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
