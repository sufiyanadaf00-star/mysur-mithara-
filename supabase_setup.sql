-- MYSURU MITHRA — RUN ALL OF THIS IN SUPABASE SQL EDITOR
create extension if not exists pgcrypto;
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  dish text not null check (dish in ('Mysuru Avalakki','Rose Mithaas')),
  rating smallint not null check (rating between 1 and 5),
  review text not null default '' check (char_length(review) <= 250)
);
alter table public.feedback enable row level security;
grant insert on public.feedback to anon, authenticated;
grant select on public.feedback to authenticated;
drop policy if exists "public can submit feedback" on public.feedback;
create policy "public can submit feedback" on public.feedback for insert to anon, authenticated with check (true);
drop policy if exists "team can read feedback" on public.feedback;
create policy "team can read feedback" on public.feedback for select to authenticated using (true);
create or replace function public.get_public_rating_summary()
returns table(dish text, average_rating numeric, rating_count bigint)
language sql security definer set search_path = public
as $$ select f.dish, round(avg(f.rating)::numeric,1), count(*) from public.feedback f group by f.dish order by f.dish; $$;
revoke all on function public.get_public_rating_summary() from public;
grant execute on function public.get_public_rating_summary() to anon, authenticated;
