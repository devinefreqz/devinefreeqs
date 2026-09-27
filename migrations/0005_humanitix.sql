alter table ledger add column if not exists external_id text;
create unique index if not exists ledger_external_id_key on ledger (external_id);

create table if not exists sync_state (
  key text primary key,
  synced_at timestamptz not null,
  note text not null default ''
);
