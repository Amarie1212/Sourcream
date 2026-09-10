create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_slug text not null,
  title text not null,
  image text,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  unique (user_id, anime_slug)
);

alter table public.watchlist add column if not exists status text not null default 'planned';

-- Status yang didukung: planned, watching (ditampilkan sebagai "On Watch"),
-- watched, on_hold, dan dropped.

alter table public.watchlist enable row level security;

create index if not exists watchlist_user_id_created_at_idx
  on public.watchlist (user_id, created_at desc);

drop policy if exists "Users can view their own watchlist" on public.watchlist;
drop policy if exists "Users can add to their own watchlist" on public.watchlist;
drop policy if exists "Users can remove their own watchlist" on public.watchlist;
drop policy if exists "Users can update their own watchlist" on public.watchlist;

create policy "Users can view their own watchlist"
  on public.watchlist for select
  using (auth.uid() = user_id);

create policy "Users can add to their own watchlist"
  on public.watchlist for insert
  with check (auth.uid() = user_id);

create policy "Users can remove their own watchlist"
  on public.watchlist for delete
  using (auth.uid() = user_id);

create policy "Users can update their own watchlist"
  on public.watchlist for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.watch_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_slug text not null,
  anime_title text not null,
  episode_slug text not null,
  episode_number numeric not null,
  watched_at timestamptz not null default now(),
  unique (user_id, anime_slug, episode_number)
);

alter table public.watch_progress enable row level security;
create index if not exists watch_progress_user_anime_idx
  on public.watch_progress (user_id, anime_slug, episode_number desc);
drop policy if exists "Users can view their own progress" on public.watch_progress;
drop policy if exists "Users can add their own progress" on public.watch_progress;
create policy "Users can view their own progress"
  on public.watch_progress for select using (auth.uid() = user_id);
create policy "Users can add their own progress"
  on public.watch_progress for insert with check (auth.uid() = user_id);

