-- Events can hold problems, plus one sample event for LSPU Santa Cruz students. Paste into the SQL Editor once.
alter table events add column problem_ids text[] not null default '{}';

insert into orgs (id, name, school_name, campus_id, campus_name, program_name)
values ('lspu-scc', 'LSPU SCC', 'LSPU', 'santa-cruz', 'Santa Cruz Campus (Main)', 'All programs');

insert into events (org_id, title, summary, starts_on, access, banner, featured, problem_ids)
values ('lspu-scc', 'LSPU SCC coding sprint (sample)', 'Three warm-up problems for LSPU Santa Cruz students.', '2026-11-30', 'campus-only', 'codelines', true,
        array['hello-world', 'sum-two-integers', 'even-or-odd']);

-- To remove the sample later: delete from orgs where id = 'lspu-scc';
