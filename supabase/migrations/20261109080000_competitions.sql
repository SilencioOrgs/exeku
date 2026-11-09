-- Competitions can target several campuses and organizations. Paste into the SQL Editor once.
alter table events alter column org_id drop not null;
alter table events add column campus_ids text[] not null default '{}';
alter table events add column org_ids text[] not null default '{}';
-- The names shown to students, saved when the competition is created.
alter table events add column audience_label text;
