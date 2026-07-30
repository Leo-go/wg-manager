-- Enable Yandex CDN only for selected users.
-- Run once in Supabase SQL Editor.

alter table public.profiles
  add column if not exists enable_yandex_cdn boolean default false;

comment on column public.profiles.enable_yandex_cdn is
  'Allows this user to access the Yandex CDN onboarding and install flow';
