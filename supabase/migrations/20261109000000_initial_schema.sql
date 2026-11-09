-- Exeku's first schema. Paste into the Supabase SQL Editor once.
-- Clerk user IDs are text. The browser never talks to these tables: every read and write goes through
-- the Next.js server with the secret key, so row level security is on with no policies.

create table schools (
  id text primary key,
  name text not null,
  short_name text not null,
  location_id text not null,
  location_name text not null,
  email_domains text[] not null,
  programs jsonb not null default '[]',
  campuses jsonb not null default '[]'
);

insert into schools (id, name, short_name, location_id, location_name, email_domains, programs, campuses) values (
  'lspu', 'Laguna State Polytechnic University', 'LSPU', 'laguna', 'Laguna', array['lspu.edu.ph'],
  '[{"id":"bscpe","name":"BSCPE"}]',
  '[{"id":"santa-cruz","name":"Santa Cruz Campus (Main)"},{"id":"siniloan","name":"Siniloan Campus (Host)"},{"id":"san-pablo","name":"San Pablo City Campus"},{"id":"los-banos","name":"Los Baños Campus"}]'
);

create table profiles (
  user_id text primary key,
  display_name text not null,
  school_email text,
  age int check (age between 13 and 100),
  school jsonb,
  campus_id text,
  created_at timestamptz not null default now()
);

create table school_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by text not null references profiles on delete cascade,
  name text not null,
  location text not null,
  campus text,
  email_domain text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (requested_by, email_domain)
);

create table orgs (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  school_name text not null,
  campus_id text not null,
  campus_name text not null,
  program_name text not null
);

create table org_members (
  org_id text not null references orgs on delete cascade,
  user_id text not null references profiles on delete cascade,
  role text not null check (role in ('president', 'officer', 'member')),
  primary key (org_id, user_id)
);
create unique index one_president_per_org on org_members (org_id) where role = 'president';
create index org_members_user on org_members (user_id);

create table org_applications (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references orgs on delete cascade,
  user_id text not null references profiles on delete cascade,
  program text,
  status text not null default 'pending' check (status in ('pending', 'rejected')),
  unique (org_id, user_id)
);

create table events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references orgs on delete cascade,
  title text not null,
  summary text not null,
  starts_on date not null,
  access text not null check (access in ('open', 'campus-only', 'org-only')),
  banner text not null,
  featured boolean not null default false,
  winners jsonb
);
create unique index one_featured_event_per_org on events (org_id) where featured;

create table submissions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles on delete cascade,
  problem_id text not null,
  language text not null,
  verdict text not null,
  points int not null default 0,
  created_at timestamptz not null default now()
);
create index submissions_accepted on submissions (user_id, problem_id) where verdict = 'ACCEPTED';

-- Each solved problem counts once per student.
create view leaderboard with (security_invoker = true) as
select p.user_id, p.display_name as name, coalesce(p.campus_id, '') as campus_id,
       coalesce(p.school->>'campus', 'No school yet') as campus_name,
       count(*)::int as solved, sum(s.points)::int as points
from (
  select distinct on (user_id, problem_id) user_id, problem_id, points
  from submissions where verdict = 'ACCEPTED'
  order by user_id, problem_id, points desc
) s
join profiles p using (user_id)
group by p.user_id;

alter table schools enable row level security;
alter table profiles enable row level security;
alter table school_requests enable row level security;
alter table orgs enable row level security;
alter table org_members enable row level security;
alter table org_applications enable row level security;
alter table events enable row level security;
alter table submissions enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
