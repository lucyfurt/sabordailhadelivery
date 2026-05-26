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

-- RLS: desabilitado; acesso via service role no servidor Next.js
alter table orders enable row level security;
alter table daily_counters enable row level security;
