-- Store student date of birth alongside computed age (private to the signed-in user).
alter table profiles
  add column if not exists birthday date;
