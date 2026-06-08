create extension if not exists pgcrypto;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'setup',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  game_state jsonb not null
);

create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists games_set_updated_at on public.games;
create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

alter table public.games enable row level security;
alter table public.game_events enable row level security;

drop policy if exists "public can read games" on public.games;
create policy "public can read games"
on public.games for select
to anon
using (true);

drop policy if exists "public can create games" on public.games;
create policy "public can create games"
on public.games for insert
to anon
with check (true);

drop policy if exists "public can update games" on public.games;
create policy "public can update games"
on public.games for update
to anon
using (true)
with check (true);

drop policy if exists "public can read game events" on public.game_events;
create policy "public can read game events"
on public.game_events for select
to anon
using (true);

drop policy if exists "public can create game events" on public.game_events;
create policy "public can create game events"
on public.game_events for insert
to anon
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'games'
  ) then
    alter publication supabase_realtime add table public.games;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'game_events'
  ) then
    alter publication supabase_realtime add table public.game_events;
  end if;
end;
$$;
