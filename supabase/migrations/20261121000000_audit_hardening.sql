-- Audit hardening migration:
-- 1. Enforce case-insensitive uniqueness on profiles.school_email.
-- 2. Fix check_tournament_team_size() trigger when events.team_size is NULL (defaults to 1, matching app logic).
-- 3. Add server-only problem_summaries view so catalog listings never pull hidden test_cases JSONB.
-- 4. Add indexes on submissions(created_at) and submissions(verdict) for admin telemetry queries.

create unique index if not exists profiles_school_email_unique
  on profiles (lower(school_email))
  where school_email is not null;

create or replace function check_tournament_team_size()
returns trigger
language plpgsql
as $$
declare
  max_members int;
  current_members int;
begin
  perform 1 from tournament_teams where id = new.team_id for update;
  select coalesce(e.team_size, 1) into max_members from events e where e.id = new.event_id;
  if max_members is not null then
    select count(*)::int into current_members from tournament_members where team_id = new.team_id;
    if current_members >= max_members then
      raise exception 'team_full' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace view problem_summaries with (security_invoker = true) as
select
  id,
  title,
  difficulty,
  category,
  tags,
  supported_languages,
  created_at,
  coalesce(jsonb_array_length(test_cases), 0)::int as total_tests_count,
  (
    select count(*)::int
    from jsonb_array_elements(test_cases) as elem
    where not coalesce((elem->>'isHidden')::boolean, false)
  ) as sample_count
from problems;

revoke all on problem_summaries from anon, authenticated;
grant select on problem_summaries to service_role;

create index if not exists submissions_created_at_idx on submissions (created_at desc);
create index if not exists submissions_verdict_idx on submissions (verdict);
