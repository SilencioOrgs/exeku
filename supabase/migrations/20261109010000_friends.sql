-- Find friends. Paste into the Supabase SQL Editor once, after the first migration.
alter table profiles add column avatar_id text not null default 'glitch-bot';
alter table profiles add column border_id text not null default 'none';

create table friendships (
  requester text not null references profiles on delete cascade,
  addressee text not null references profiles on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- One row per pair, whichever person asked first.
create unique index one_friendship_per_pair on friendships (least(requester, addressee), greatest(requester, addressee));
create index friendships_addressee on friendships (addressee);

alter table friendships enable row level security;
revoke all on friendships from anon, authenticated;
grant all on friendships to service_role;
