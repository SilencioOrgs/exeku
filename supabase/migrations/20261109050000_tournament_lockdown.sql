-- Records each time a student leaves full screen or the tab during a live tournament. Paste into the SQL Editor once.
create table tournament_violations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events on delete cascade,
  user_id text not null references profiles on delete cascade,
  kind text not null check (kind in ('fullscreen', 'tab', 'focus')),
  created_at timestamptz not null default now()
);
create index tournament_violations_event on tournament_violations (event_id, user_id);

alter table tournament_violations enable row level security;
revoke all on tournament_violations from anon, authenticated;
grant all on tournament_violations to service_role;
