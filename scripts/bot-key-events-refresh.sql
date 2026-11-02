-- Allow home refresh batch to audit with action=refresh
-- Run in Supabase SQL Editor after bot-key-events.sql

ALTER TABLE bot_key_events DROP CONSTRAINT IF EXISTS bot_key_events_action_check;
ALTER TABLE bot_key_events ADD CONSTRAINT bot_key_events_action_check
  CHECK (action IN ('add', 'remove', 'restore', 'revoke', 'provision', 'refresh'));
