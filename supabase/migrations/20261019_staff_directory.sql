-- Staff registry for follow-up assignments. Run in Supabase SQL Editor.
-- This directory does not grant login or admin access by itself.
create table if not exists public.tsc_staff_directory (
 id uuid primary key default gen_random_uuid(),
 display_name text not null unique check (length(btrim(display_name)) > 0),
 user_id uuid unique references auth.users(id) on delete set null,
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.tsc_staff_directory enable row level security;
drop policy if exists "TSC staff directory read" on public.tsc_staff_directory;
create policy "TSC staff directory read" on public.tsc_staff_directory
 for select to authenticated using (public.tsc_is_staff());
drop policy if exists "TSC admin add staff directory" on public.tsc_staff_directory;
create policy "TSC admin add staff directory" on public.tsc_staff_directory
 for insert to authenticated with check (
  exists(select 1 from public.vip_profiles p where p.user_id=auth.uid() and p.role='admin')
 );
drop policy if exists "TSC admin edit staff directory" on public.tsc_staff_directory;
create policy "TSC admin edit staff directory" on public.tsc_staff_directory
 for update to authenticated
 using (exists(select 1 from public.vip_profiles p where p.user_id=auth.uid() and p.role='admin'))
 with check (exists(select 1 from public.vip_profiles p where p.user_id=auth.uid() and p.role='admin'));
insert into public.tsc_staff_directory (display_name)
values ('李心瑜'),('吳如虹'),('陳柏儒')
on conflict (display_name) do nothing;
-- Do not assign a user_id without confirming the exact Supabase Authentication UUID.
