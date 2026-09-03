-- Reset fundraising counter for a clean bot launch.
-- Does NOT revoke VPN keys or delete bot_users.
-- Run in Supabase SQL Editor, then check «Статус» in the bot.

-- 1) Wipe all donation records (collected bar goes to 0)
TRUNCATE donations RESTART IDENTITY;

-- 2) Reset / set current Moscow month goal (adjust target_rub if needed)
INSERT INTO monthly_goals (month, target_rub, description)
VALUES (
  to_char((now() AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM'),
  2000,
  'Чистый старт складчины'
)
ON CONFLICT (month) DO UPDATE
SET
  target_rub = EXCLUDED.target_rub,
  description = EXCLUDED.description,
  updated_at = now();

-- Optional: clear other months' goals history
-- DELETE FROM monthly_goals
-- WHERE month <> to_char((now() AT TIME ZONE 'Europe/Moscow'), 'YYYY-MM');
