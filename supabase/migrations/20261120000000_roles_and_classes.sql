-- Role-based access (student / teacher / admin), faculty verification requests,
-- and teacher classrooms with invite codes, student groups, and assigned problems.
-- Paste into the Supabase SQL Editor once.

alter table profiles
  add column if not exists role text not null default 'student'
  check (role in ('student', 'teacher', 'admin'));

update profiles set role = 'admin' where is_admin = true and role <> 'admin';

create table if not exists faculty_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles on delete cascade,
  school_name text not null,
  department text not null,
  position_title text not null,
  employee_id text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by text references profiles on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);
create unique index if not exists one_pending_faculty_request_per_user
  on faculty_requests (user_id) where status = 'pending';
create index if not exists faculty_requests_status
  on faculty_requests (status, created_at desc);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id text not null references profiles on delete cascade,
  name text not null,
  section text,
  description text,
  invite_code text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists classes_teacher on classes (teacher_id, created_at desc);

create table if not exists class_groups (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);
create index if not exists class_groups_class on class_groups (class_id);

create table if not exists class_members (
  class_id uuid not null references classes on delete cascade,
  user_id text not null references profiles on delete cascade,
  group_id uuid references class_groups on delete set null,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create index if not exists class_members_user on class_members (user_id);
create index if not exists class_members_group on class_members (group_id);

create table if not exists class_problems (
  class_id uuid not null references classes on delete cascade,
  problem_id text not null,
  assigned_at timestamptz not null default now(),
  due_at timestamptz,
  primary key (class_id, problem_id)
);
create index if not exists class_problems_class on class_problems (class_id, assigned_at desc);

alter table faculty_requests enable row level security;
alter table classes enable row level security;
alter table class_groups enable row level security;
alter table class_members enable row level security;
alter table class_problems enable row level security;

revoke all on faculty_requests, classes, class_groups, class_members, class_problems from anon, authenticated;
grant all on faculty_requests, classes, class_groups, class_members, class_problems to service_role;
