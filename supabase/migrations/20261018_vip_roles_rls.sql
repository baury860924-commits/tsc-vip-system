-- TSC VIP phase 1: roles and member access. Run in Supabase SQL Editor as project owner.
create table if not exists public.vip_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'vip' check (role in ('admin','staff','vip')),
 display_name text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.vip_members (
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id) on delete set null,
 vip_number text unique,
 name text not null,
 company text not null default '',
 industry text not null default '',
 contract_start date,
 contract_end date,
 created_at timestamptz not null default now()
);
alter table public.vip_profiles enable row level security;
alter table public.vip_members enable row level security;
-- SECURITY DEFINER avoids recursive policies; function uses authenticated user id only.
create or replace function public.tsc_is_staff()
returns boolean language sql stable security definer set search_path = ''
as $$select exists(select 1 from public.vip_profiles p where p.user_id = (select auth.uid()) and p.role in ('admin','staff'))$$;
revoke all on function public.tsc_is_staff() from public;
grant execute on function public.tsc_is_staff() to authenticated;
drop policy if exists "profile read own or staff" on public.vip_profiles;
create policy "profile read own or staff" on public.vip_profiles for select to authenticated
using (user_id=(select auth.uid()) or public.tsc_is_staff());
drop policy if exists "member read own or staff" on public.vip_members;
create policy "member read own or staff" on public.vip_members for select to authenticated
using (user_id=(select auth.uid()) or public.tsc_is_staff());
drop policy if exists "member insert staff" on public.vip_members;
create policy "member insert staff" on public.vip_members for insert to authenticated
with check (public.tsc_is_staff());
drop policy if exists "member update staff" on public.vip_members;
create policy "member update staff" on public.vip_members for update to authenticated
using (public.tsc_is_staff()) with check (public.tsc_is_staff());
drop policy if exists "member delete staff" on public.vip_members;
create policy "member delete staff" on public.vip_members for delete to authenticated
using (public.tsc_is_staff());
-- Bootstrap only the confirmed existing account ID. No email-based auto-grant.
insert into public.vip_profiles(user_id,role,display_name)
select id,'admin','TSC 管理員' from auth.users
where id='82765ee5-bf66-4099-b44b-f64a316bd313'::uuid
  and email='baury860924@gmail.com'
on conflict(user_id) do update set role='admin';
