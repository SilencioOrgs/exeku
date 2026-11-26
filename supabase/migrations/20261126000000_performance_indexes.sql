-- Performance indexes for hot per-request filters & real-time friend notifications.
-- Safe to run multiple times; paste into the Supabase SQL Editor once.

-- Events: active/upcoming tournament lock checks and org/feed ordering.
create index if not exists events_ends_at_idx on events (ends_at) where ends_at is not null;
create index if not exists events_org_starts_idx on events (org_id, starts_on desc, id);
create index if not exists events_starts_idx on events (starts_on desc, id);

-- Class problems: reverse lookup by problem_id (cls-* access checks) and deadline window scans.
create index if not exists class_problems_problem_class_idx on class_problems (problem_id, class_id);
create index if not exists class_problems_class_due_idx on class_problems (class_id, due_at) where due_at is not null;

-- Profiles: campus filtering (friends, leaderboard) and trigram search on display_name.
create index if not exists profiles_campus_idx on profiles (campus_id) where campus_id is not null;
create extension if not exists pg_trgm;
create index if not exists profiles_display_name_trgm_idx on profiles using gin (display_name gin_trgm_ops);

-- Org applications: per-user status lookup and pending queue per org.
create index if not exists org_applications_user_org_idx on org_applications (user_id, org_id);
create index if not exists org_applications_org_pending_idx on org_applications (org_id, id) where status = 'pending';

-- Faculty verification: latest request per user.
create index if not exists faculty_requests_user_created_idx on faculty_requests (user_id, created_at desc);

-- Submissions: covering partial index for the leaderboard view (non-class accepted solves).
create index if not exists submissions_leaderboard_idx
  on submissions (user_id, problem_id, points desc)
  where verdict = 'ACCEPTED' and problem_id not like 'cls-%';

-- Friendships: fast accepted-edge lookups in both directions.
create index if not exists friendships_accepted_requester_idx
  on friendships (requester, addressee)
  where status = 'accepted';
create index if not exists friendships_accepted_addressee_idx
  on friendships (addressee, requester)
  where status = 'accepted';

-- Remove redundant prefix index (already covered by learn_progress primary key (user_id, chapter_id, language)).
drop index if exists learn_progress_user_idx;

-- Allow friend_request and friend_accepted notifications for real-time social alerts.
alter table notifications drop constraint if exists notifications_kind_check;
alter table notifications add constraint notifications_kind_check
  check (kind in (
    'class_activity',
    'class_problem',
    'class_deadline',
    'org_status',
    'faculty_status',
    'friend_request',
    'friend_accepted'
  ));
