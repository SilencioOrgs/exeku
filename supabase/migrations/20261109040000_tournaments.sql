-- Timed team tournaments, plus one sample. Paste into the SQL Editor once, after the LSPU SCC event migration.
alter table events add column starts_at timestamptz;
alter table events add column ends_at timestamptz;
alter table events add column team_size int check (team_size between 1 and 10);

create table tournament_teams (
  id uuid primary key,
  event_id uuid not null references events on delete cascade,
  name text not null,
  unique (event_id, name)
);

create table tournament_members (
  event_id uuid not null references events on delete cascade,
  team_id uuid not null references tournament_teams on delete cascade,
  user_id text not null references profiles on delete cascade,
  primary key (event_id, user_id)
);
create index tournament_members_user on tournament_members (user_id);
create index tournament_members_team on tournament_members (team_id);
create index submissions_user_time on submissions (user_id, created_at) where verdict = 'ACCEPTED';

alter table tournament_teams enable row level security;
alter table tournament_members enable row level security;
revoke all on tournament_teams, tournament_members from anon, authenticated;
grant all on tournament_teams, tournament_members to service_role;

-- Registration is open for 10 minutes from when you run this, then it runs for 30.
insert into events (org_id, title, summary, starts_on, access, banner, featured, problem_ids, starts_at, ends_at, team_size)
values ('lspu-scc', 'LSPU SCC team tournament (sample)', 'Register a team of up to 3. Problems unlock when the timer starts.',
        (now() at time zone 'Asia/Manila')::date, 'campus-only', 'podium', false,
        array['hello-world', 'sum-two-integers', 'even-or-odd'], now() + interval '10 minutes', now() + interval '40 minutes', 3);

-- To run the sample again:
-- delete from tournament_teams where event_id = (select id from events where title = 'LSPU SCC team tournament (sample)');
-- update events set starts_at = now() + interval '10 minutes', ends_at = now() + interval '40 minutes' where title = 'LSPU SCC team tournament (sample)';
