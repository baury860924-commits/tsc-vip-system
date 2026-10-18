-- Assign VIP members to TSC staff while retaining assignment history.
create table if not exists public.vip_staff_assignments (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.vip_members(id) on delete cascade,
 staff_user_id uuid not null references public.vip_profiles(user_id),
 assigned_by uuid not null references auth.users(id),
 assigned_at timestamptz not null default now(),
 ended_at timestamptz,
 constraint assignment_dates check (ended_at is null or ended_at >= assigned_at)
);
create unique index if not exists vip_staff_one_active_assignment
 on public.vip_staff_assignments(member_id) where ended_at is null;
alter table public.vip_staff_assignments enable row level security;
drop policy if exists "assignment staff read" on public.vip_staff_assignments;
create policy "assignment staff read" on public.vip_staff_assignments for select to authenticated using (public.tsc_is_staff());
drop policy if exists "assignment admin insert" on public.vip_staff_assignments;
create policy "assignment admin insert" on public.vip_staff_assignments for insert to authenticated
 with check (exists(select 1 from public.vip_profiles p where p.user_id=(select auth.uid()) and p.role='admin') and assigned_by=(select auth.uid()) and exists(select 1 from public.vip_profiles p where p.user_id=staff_user_id and p.role in ('admin','staff')));
drop policy if exists "assignment admin update" on public.vip_staff_assignments;
create policy "assignment admin update" on public.vip_staff_assignments for update to authenticated
 using (exists(select 1 from public.vip_profiles p where p.user_id=(select auth.uid()) and p.role='admin'))
 with check (exists(select 1 from public.vip_profiles p where p.user_id=(select auth.uid()) and p.role='admin'));
