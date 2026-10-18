-- MYSURU MITHRA: SECURITY + ADMIN ACTIONS
-- Run all of this once in the Supabase SQL Editor. It is safe to run again and does not touch existing rows.
--
-- After running it:
--   * Students (anyone with the website) can only ADD feedback, and only valid feedback.
--   * Only the team admin account(s) listed below can READ, ADD and DELETE feedback in admin.html.
--   * The home page still shows the averages through get_public_rating_summary().
--
-- To give another team account admin access, add its email to the list in is_team_admin() and run this again.

create or replace function public.is_team_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') in (
    'teampoineer@gmail.com'
  )
$$;

-- Row level security must be on, or every API key can read and change every row.
alter table public.feedback enable row level security;

-- Start from a clean slate: drop whatever policies the table had.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'feedback' loop
    execute format('drop policy %I on public.feedback', p.policyname);
  end loop;
end $$;

-- Table privileges: the public may only insert; logged-in accounts may read, insert and delete
-- (and the policies below narrow that to the team admin list). No one may update or truncate.
revoke all on public.feedback from anon, authenticated;
grant insert on public.feedback to anon;
grant select, insert, delete on public.feedback to authenticated;

create policy "anyone can submit valid feedback" on public.feedback
  for insert to anon, authenticated
  with check (
    char_length(trim(name)) between 1 and 80
    and dish in ('Mysuru Avalakki', 'Rose Mithaas')
    and rating between 1 and 5
    and char_length(coalesce(review, '')) <= 250
  );

create policy "team can read feedback" on public.feedback
  for select to authenticated
  using (public.is_team_admin());

create policy "team can delete feedback" on public.feedback
  for delete to authenticated
  using (public.is_team_admin());

-- Public averages for the home page. SECURITY DEFINER lets it count rows the public cannot read.
drop function if exists public.get_public_rating_summary();
create function public.get_public_rating_summary()
returns table(dish text, average_rating numeric, rating_count bigint)
language sql
security definer
set search_path = public
as $$
  select f.dish::text, round(avg(f.rating)::numeric, 1), count(*)
  from public.feedback f
  group by f.dish
  order by f.dish;
$$;
revoke all on function public.get_public_rating_summary() from public;
grant execute on function public.get_public_rating_summary() to anon, authenticated;

-- Public "Student Reviews" list on the home page. Shares only the FIRST name, never the full name.
drop function if exists public.get_public_reviews();
create function public.get_public_reviews()
returns table(first_name text, dish text, rating int, review text, created_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select split_part(trim(f.name::text), ' ', 1),
         f.dish::text,
         f.rating::int,
         coalesce(f.review::text, ''),
         f.created_at::timestamptz
  from public.feedback f
  order by f.rating desc, f.created_at desc
  limit 300;
$$;
revoke all on function public.get_public_reviews() from public;
grant execute on function public.get_public_reviews() to anon, authenticated;
