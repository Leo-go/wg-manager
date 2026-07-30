-- Per-user gate for Yandex CDN UI / install.
-- Run in Supabase SQL Editor (prod + local).

alter table public.profiles
  add column if not exists enable_yandex_cdn boolean not null default false;

comment on column public.profiles.enable_yandex_cdn is
  'When true, this account can see and use Yandex CDN setup in the panel.';
