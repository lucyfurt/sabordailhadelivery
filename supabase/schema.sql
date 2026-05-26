-- Execute no SQL Editor do Supabase

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  customer_phone text not null,
  delivery_type text not null check (delivery_type in ('pickup', 'delivery')),
  address text,
  meal_type_id text not null,
  meal_type_name text not null,
  protein_id text not null,
  protein_name text not null,
  sides jsonb not null,
  notes text,
  total_cents integer not null,
  status text not null default 'awaiting_payment',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_order_number_idx on orders (order_number);

create table if not exists daily_counters (
  date_key text primary key,
  counter integer not null default 0
);

create or replace function increment_daily_counter(p_date text)
returns integer
language plpgsql
as $$
declare
  new_counter integer;
begin
  insert into daily_counters (date_key, counter)
  values (p_date, 1)
  on conflict (date_key)
  do update set counter = daily_counters.counter + 1
  returning counter into new_counter;
  return new_counter;
end;
$$;

-- RLS
-- MVP:
-- - Clientes (pelo servidor Next.js) precisam conseguir INSERT de pedidos
-- - Clientes consultam APENAS o pedido por número (telefone não é exposto na API)
-- - Apenas o admin (service_role) pode UPDATE de status
alter table orders enable row level security;
alter table daily_counters enable row level security;

-- Permite que pedidos sejam criados (INSERT) e consultados públicos (SELECT) via role anon
-- (isso evita o erro "new row violates row-level security policy" no INSERT).
create policy "orders_public_insert" on orders
for insert
to anon, authenticated
with check (true);

create policy "orders_service_role_insert" on orders
for insert
to service_role
with check (true);

create policy "orders_public_select" on orders
for select
to anon, authenticated
using (true);

create policy "orders_service_role_select" on orders
for select
to service_role
using (true);

-- Admin atualiza status do pedido com service role
create policy "orders_service_role_update" on orders
for update
to service_role
using (true)
with check (true);

-- O contador diário é interno ao sistema; liberar INSERT/UPDATE para anon e service_role
-- simplifica o uso do RPC increment_daily_counter.
create policy "daily_counters_anon_rw" on daily_counters
for all
to anon, authenticated
using (true)
with check (true);

create policy "daily_counters_service_role_rw" on daily_counters
for all
to service_role
using (true)
with check (true);

-- =========================
-- Cardápio editável (admin)
-- =========================
create table if not exists proteins (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  available boolean not null default true,
  fit boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  available boolean not null default true,
  fit boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table proteins enable row level security;
alter table sides enable row level security;

-- Público pode ler (para montar pedido no site)
create policy "proteins_public_select" on proteins
for select
to anon, authenticated
using (true);

create policy "sides_public_select" on sides
for select
to anon, authenticated
using (true);

-- Admin (service_role via Next.js server) pode gerenciar
create policy "proteins_service_role_all" on proteins
for all
to service_role
using (true)
with check (true);

create policy "sides_service_role_all" on sides
for all
to service_role
using (true)
with check (true);
