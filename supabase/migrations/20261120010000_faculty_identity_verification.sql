-- Store faculty complete name, verified school email, and Clerk OTP verification status.
-- Safe to run after 20261120000000_roles_and_classes.sql.

alter table faculty_requests
  add column if not exists full_name text not null default '',
  add column if not exists school_email text not null default '',
  add column if not exists email_verified boolean not null default false;
