create or replace function promote_founder_email()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from "user"
    where id = new.user_id
      and lower(email) = 'divinefrequencies42@gmail.com'
  ) then
    new.rank := 'Founder';
  end if;
  return new;
end;
$$;

drop trigger if exists promote_founder_email_trg on profiles;
create trigger promote_founder_email_trg
before insert or update on profiles
for each row
execute function promote_founder_email();
