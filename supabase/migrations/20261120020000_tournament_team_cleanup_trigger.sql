-- Atomically remove a tournament team when its last member leaves, preventing the
-- check-then-delete race where a concurrently joining student gets cascade-deleted.
create or replace function delete_empty_tournament_team()
returns trigger
language plpgsql
as $$
begin
  perform 1 from tournament_teams where id = old.team_id for update;
  if not exists (select 1 from tournament_members where team_id = old.team_id) then
    delete from tournament_teams where id = old.team_id;
  end if;
  return old;
end;
$$;

drop trigger if exists tournament_members_cleanup_empty_team on tournament_members;
create trigger tournament_members_cleanup_empty_team
after delete on tournament_members
for each row
execute function delete_empty_tournament_team();
