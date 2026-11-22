-- Class activities/announcements (with optional deadlines) and per-user student notifications.
-- Paste into the Supabase SQL Editor once.

create table if not exists class_activities (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes on delete cascade,
  teacher_id text not null references profiles on delete cascade,
  title text not null,
  body text,
  kind text not null default 'announcement' check (kind in ('announcement', 'activity', 'deadline')),
  problem_id text,
  due_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists class_activities_class on class_activities (class_id, created_at desc);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles on delete cascade,
  kind text not null check (kind in ('class_activity', 'class_problem', 'class_deadline', 'org_status', 'faculty_status')),
  title text not null,
  body text,
  href text,
  due_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on notifications (user_id) where read_at is null;

alter table class_activities enable row level security;
alter table notifications enable row level security;

revoke all on class_activities, notifications from anon, authenticated;
grant all on class_activities, notifications to service_role;
