-- Add verified-teacher adviser assignment to campus organizations.
alter table orgs add column if not exists adviser_id text references profiles(user_id) on delete set null;
create index if not exists orgs_adviser_idx on orgs (adviser_id) where adviser_id is not null;
