-- Enforces tournament team capacity in SQL under concurrent joins by locking the parent team row.
create or replace function check_tournament_team_size()
returns trigger
language plpgsql
as $$
declare
  max_members int;
  current_members int;
begin
  perform 1 from tournament_teams where id = new.team_id for update;
  select e.team_size into max_members from events e where e.id = new.event_id;
  if max_members is not null then
    select count(*)::int into current_members from tournament_members where team_id = new.team_id;
    if current_members >= max_members then
      raise exception 'team_full' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_tournament_team_size on tournament_members;
create trigger enforce_tournament_team_size
before insert on tournament_members
for each row execute function check_tournament_team_size();
