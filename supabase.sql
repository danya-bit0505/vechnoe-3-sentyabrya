-- Общий счётчик для «Вечного 3 сентября».
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить → Run.

create table if not exists public.tally (
  id    int primary key,
  total bigint not null default 0
);
insert into public.tally (id, total) values (1, 0) on conflict (id) do nothing;

-- читать могут все, писать напрямую — никто
alter table public.tally enable row level security;
drop policy if exists "tally read" on public.tally;
create policy "tally read" on public.tally for select using (true);

-- прибавить листы можно только через эту функцию; за раз не больше 200
create or replace function public.add_sheets(delta int)
returns bigint
language sql
security definer
set search_path = public
as $$
  update public.tally
     set total = total + greatest(0, least(delta, 200))
   where id = 1
  returning total;
$$;

revoke all on function public.add_sheets(int) from public;
grant execute on function public.add_sheets(int) to anon, authenticated;
