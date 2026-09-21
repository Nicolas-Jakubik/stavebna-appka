alter table public.naklady_stavby
  add column if not exists uhradene boolean not null default true;
