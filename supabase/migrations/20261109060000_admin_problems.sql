-- Admin accounts and problems created from the admin page. Paste into the SQL Editor once.
alter table profiles add column is_admin boolean not null default false;

create table problems (
  id text primary key,
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  category text not null,
  tags text[] not null default '{}',
  supported_languages text[] not null,
  input_spec text not null,
  output_spec text not null,
  constraints text[] not null default '{}',
  -- Holds the hidden tests, so this table is only ever read on the server.
  test_cases jsonb not null,
  time_limit_ms int not null check (time_limit_ms between 1000 and 5000),
  memory_limit_kb int not null check (memory_limit_kb between 64000 and 256000),
  created_by text references profiles on delete set null,
  created_at timestamptz not null default now()
);

alter table problems enable row level security;
revoke all on problems from anon, authenticated;
grant all on problems to service_role;
