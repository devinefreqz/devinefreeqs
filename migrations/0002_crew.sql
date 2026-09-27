create table if not exists profiles (
  user_id text primary key,
  name text not null,
  rank text not null
);

create table if not exists ledger (
  id serial primary key,
  entry_date date not null,
  kind text not null,
  category text not null,
  source text not null,
  amount numeric not null,
  notes text not null default ''
);

create table if not exists events (
  id serial primary key,
  name text not null,
  event_date date not null,
  event_time text not null,
  venue text not null,
  notes text not null default ''
);

create table if not exists shifts (
  event_id integer not null references events(id) on delete cascade,
  user_id text not null,
  name text not null,
  role text not null,
  primary key (event_id, user_id)
);

create table if not exists equipment (
  id serial primary key,
  name text not null,
  qty integer not null,
  unit_cost numeric not null,
  notes text not null default ''
);

insert into ledger (entry_date, kind, category, source, amount, notes)
select * from (values
  ('2026-09-06'::date, 'income', 'Tickets', 'Warehouse Session — door', 1840::numeric, 'Cash + card at door'),
  ('2026-09-06'::date, 'expense', 'Venue', 'Room hire', 650::numeric, ''),
  ('2026-09-12'::date, 'income', 'Merch', 'Sticker drop', 310::numeric, ''),
  ('2026-09-18'::date, 'expense', 'Payroll', 'Sound tech night rate', 280::numeric, '')
) as v(entry_date, kind, category, source, amount, notes)
where not exists (select 1 from ledger);

insert into events (name, event_date, event_time, venue, notes)
select * from (values
  ('Warehouse Session', '2026-10-04'::date, '21:00', 'North Melbourne warehouse', 'Doors 9, music 10.'),
  ('Afterhours Frequency', '2026-10-18'::date, '23:00', 'TBA — west side', 'Need medical cover.')
) as v(name, event_date, event_time, venue, notes)
where not exists (select 1 from events);

insert into equipment (name, qty, unit_cost, notes)
select '15 inch PA speaker', 1, 300::numeric, 'Example kit line'
where not exists (select 1 from equipment);
