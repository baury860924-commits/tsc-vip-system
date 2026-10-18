-- TSC VIP individual funnel stages (one funnel per member).
create table if not exists public.vip_funnel_stages (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.vip_members(id) on delete cascade,
 stage_number integer not null check(stage_number between 1 and 3),
 title text not null default '',
 description text not null default '',
 goal text not null default '',
 action_plan text not null default '',
 updated_at timestamptz not null default now(),
 unique(member_id,stage_number)
);
alter table public.vip_funnel_stages enable row level security;
drop policy if exists "funnel read own or staff" on public.vip_funnel_stages;
create policy "funnel read own or staff" on public.vip_funnel_stages for select to authenticated
using (
 public.tsc_is_staff()
 or exists(select 1 from public.vip_members m where m.id=member_id and m.user_id=(select auth.uid()))
);
drop policy if exists "funnel insert staff" on public.vip_funnel_stages;
create policy "funnel insert staff" on public.vip_funnel_stages for insert to authenticated
with check(public.tsc_is_staff());
drop policy if exists "funnel update staff" on public.vip_funnel_stages;
create policy "funnel update staff" on public.vip_funnel_stages for update to authenticated
using(public.tsc_is_staff()) with check(public.tsc_is_staff());
drop policy if exists "funnel delete staff" on public.vip_funnel_stages;
create policy "funnel delete staff" on public.vip_funnel_stages for delete to authenticated
using(public.tsc_is_staff());
