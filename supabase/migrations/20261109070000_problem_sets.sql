-- Reusable problem sets for the admin page, and removes the two sample events. Paste into the SQL Editor once.
create table problem_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  problem_ids text[] not null,
  created_at timestamptz not null default now()
);

alter table problem_sets enable row level security;
revoke all on problem_sets from anon, authenticated;
grant all on problem_sets to service_role;

-- Teams and warnings for these events are removed with them.
delete from events where title in ('LSPU SCC coding sprint (sample)', 'LSPU SCC team tournament (sample)');
