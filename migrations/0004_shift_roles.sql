alter table shifts drop constraint if exists shifts_pkey;
alter table shifts add primary key (event_id, user_id, role);
