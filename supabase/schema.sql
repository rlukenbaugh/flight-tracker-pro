create extension if not exists "pgcrypto";

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  price_drops boolean not null default true,
  direct_flight_available boolean not null default true,
  preferred_airline_drop boolean not null default true,
  nearly_sold_out boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_flights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flight_id text not null,
  template_id text not null,
  route text not null,
  airline text not null,
  flight_number text not null,
  cabin_class text not null,
  saved_price integer not null,
  current_price integer not null,
  alerts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (user_id, flight_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_key text not null,
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date null,
  trip_type text not null,
  travelers integer not null,
  cabin_class text not null,
  search_payload jsonb not null,
  last_seen_at timestamptz not null default now(),
  unique (user_id, route_key)
);

create table if not exists public.fare_snapshots (
  id uuid primary key default gen_random_uuid(),
  route_key text not null,
  origin text not null,
  destination text not null,
  departure_date date not null,
  return_date date null,
  trip_type text not null,
  source text not null,
  cheapest_price integer not null,
  median_price integer not null,
  sample_size integer not null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  level text not null,
  pathname text null,
  context jsonb null,
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.saved_flights enable row level security;
alter table public.saved_searches enable row level security;
alter table public.fare_snapshots enable row level security;
alter table public.usage_events enable row level security;

create policy "users manage own profile" on public.user_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own alert preferences" on public.alert_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own saved flights" on public.saved_flights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own saved searches" on public.saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "service role writes fare snapshots" on public.fare_snapshots
  for insert with check (auth.role() = 'service_role');

create policy "service role writes usage events" on public.usage_events
  for insert with check (auth.role() = 'service_role');
