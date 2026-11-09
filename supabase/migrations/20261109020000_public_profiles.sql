-- Lets students open each other's profiles. Paste into the Supabase SQL Editor once, after the friends migration.
alter table profiles add column bio text;
alter table profiles add column social_links jsonb;
