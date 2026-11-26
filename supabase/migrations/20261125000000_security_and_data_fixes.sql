-- Audit security & data fixes:
-- 1. Correct hidden test lus-4 ("exekuplatform") expectedOutput from "11" to "12" on longest-unique-substring.
-- 2. Exclude custom class problems (cls-*) from global leaderboard points & solve counts.

update problems
set test_cases = (
  select jsonb_agg(
    case
      when elem->>'id' = 'lus-4' and elem->>'input' = 'exekuplatform'
        then jsonb_set(elem, '{expectedOutput}', '"12"'::jsonb)
      else elem
    end
    order by ord
  )
  from jsonb_array_elements(test_cases) with ordinality as t(elem, ord)
)
where id = 'longest-unique-substring'
  and exists (
    select 1
    from jsonb_array_elements(test_cases) as elem
    where elem->>'id' = 'lus-4' and elem->>'expectedOutput' = '11'
  );

update submissions
set points = 0
where problem_id like 'cls-%' and points <> 0;

create or replace view leaderboard with (security_invoker = true) as
select p.user_id, p.display_name as name, coalesce(p.campus_id, '') as campus_id,
       coalesce(p.school->>'campus', 'No school yet') as campus_name,
       count(*)::int as solved, sum(s.points)::int as points
from (
  select distinct on (user_id, problem_id) user_id, problem_id, points
  from submissions
  where verdict = 'ACCEPTED' and problem_id not like 'cls-%'
  order by user_id, problem_id, points desc
) s
join profiles p using (user_id)
group by p.user_id;

revoke all on leaderboard from anon, authenticated;
grant select on leaderboard to service_role;
