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
  proteins jsonb not null default '[]'::jsonb,
  sides jsonb not null,
  items jsonb not null default '[]'::jsonb,
  notes text,
  total_cents integer not null,
  status text not null default 'awaiting_payment',
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on orders (created_at desc);
create index if not exists orders_order_number_idx on orders (order_number);

-- Pedidos com várias marmitas (execute se a tabela já existir)
alter table orders add column if not exists items jsonb not null default '[]'::jsonb;

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

-- Tipos de marmita (preço e quantidades por tipo)
create table if not exists meal_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null default '',
  price_cents integer not null,
  emoji text not null default '🍱',
  required_proteins integer not null default 1 check (required_proteins >= 0 and required_proteins <= 10),
  required_sides integer not null default 4 check (required_sides >= 0 and required_sides <= 20),
  available boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table meal_types enable row level security;

create policy "meal_types_public_select" on meal_types
for select
to anon, authenticated
using (true);

create policy "meal_types_service_role_all" on meal_types
for all
to service_role
using (true)
with check (true);

-- Itens permitidos por tipo de marmita (isolamento entre marmitas)
create table if not exists meal_type_proteins (
  meal_type_id uuid not null references meal_types(id) on delete cascade,
  protein_id uuid not null references proteins(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_type_id, protein_id)
);

create table if not exists meal_type_sides (
  meal_type_id uuid not null references meal_types(id) on delete cascade,
  side_id uuid not null references sides(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (meal_type_id, side_id)
);

alter table meal_type_proteins enable row level security;
alter table meal_type_sides enable row level security;

create policy "meal_type_proteins_public_select" on meal_type_proteins
for select
to anon, authenticated
using (true);

create policy "meal_type_sides_public_select" on meal_type_sides
for select
to anon, authenticated
using (true);

create policy "meal_type_proteins_service_role_all" on meal_type_proteins
for all
to service_role
using (true)
with check (true);

create policy "meal_type_sides_service_role_all" on meal_type_sides
for all
to service_role
using (true)
with check (true);

-- Pedidos antigos: adicionar coluna proteins se a tabela já existir
alter table orders add column if not exists proteins jsonb not null default '[]'::jsonb;

-- Dados iniciais (rode uma vez; ignore erro se já existir)
insert into meal_types (slug, name, description, price_cents, emoji, required_proteins, required_sides, position)
values
  ('pf', 'PF Caseiro', 'Monte com proteína e acompanhamentos à sua escolha.', 1990, '🍱', 1, 4, 0),
  ('executiva', 'Marmita Executiva', 'Porção reforçada com proteína e acompanhamentos.', 2490, '🔥', 1, 4, 1),
  ('fit', 'Marmita Fit', 'Linha mais leve.', 2290, '🥗', 1, 4, 2)
on conflict (slug) do nothing;

-- Vincula todos os itens atuais aos tipos existentes (bootstrap inicial).
insert into meal_type_proteins (meal_type_id, protein_id)
select mt.id, p.id
from meal_types mt
cross join proteins p
on conflict do nothing;

insert into meal_type_sides (meal_type_id, side_id)
select mt.id, s.id
from meal_types mt
cross join sides s
on conflict do nothing;
