-- PONKARO: databáza v NOVOM samostatnom Supabase projekte.
-- NIKDY NEPOUŽIŤ databázu projektu MojaFiremnaApp ani CvikniSi.
-- Skript sa zatiaľ NEVYKONÁVA, je pripravený na schválenú migráciu.
create table if not exists public.ponkaro_documents (
  id uuid primary key,
  kind text not null check (kind in ('supis','ponuka','objednavka')),
  number text not null,
  body jsonb not null check (jsonb_typeof(body) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (kind, number)
);
create index if not exists ponkaro_documents_updated_idx
  on public.ponkaro_documents (updated_at desc);
alter table public.ponkaro_documents enable row level security;
-- Žiadny priamy prístup cez verejné/klientské API.
revoke all on public.ponkaro_documents from anon, authenticated;
grant select, insert, update, delete on public.ponkaro_documents to service_role;
-- Nepridávame žiadne anon/authenticated RLS policies.
-- Server musí vykonať vlastnú kontrolu relácie a oprávnení.
