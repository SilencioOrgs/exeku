-- Persist accepted solution code on submissions so solved challenges and the
-- latest accepted answer sync across devices.
alter table submissions
  add column if not exists source_code text,
  add column if not exists files jsonb;

create index if not exists submissions_user_problem_accepted_latest_idx
  on submissions (user_id, problem_id, created_at desc, id desc)
  where verdict = 'ACCEPTED';
