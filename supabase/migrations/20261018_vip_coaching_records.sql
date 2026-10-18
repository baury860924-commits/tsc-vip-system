-- Internal VIP coaching notes; NEVER exposed to VIP accounts.
create table if not exists public.vip_coaching_records (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.vip_members(id) on delete cascade,
 contact_date date not null default current_date,
 contact_method text not null default '其他',
 invitation_sent boolean not null default false,
 member_replied boolean not null default false,
 summary text not null default '',
 next_action text not null default '',
 follow_up_date date,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
alter table public.vip_coaching_records enable row level security;
drop policy if exists "coaching staff read" on public.vip_coaching_records;
create policy "coaching staff read" on public.vip_coaching_records for select to authenticated using (public.tsc_is_staff());
drop policy if exists "coaching staff insert" on public.vip_coaching_records;
create policy "coaching staff insert" on public.vip_coaching_records for insert to authenticated with check (public.tsc_is_staff() and created_by=(select auth.uid()));
drop policy if exists "coaching staff update" on public.vip_coaching_records;
create policy "coaching staff update" on public.vip_coaching_records for update to authenticated using (public.tsc_is_staff()) with check (public.tsc_is_staff());
drop policy if exists "coaching staff delete" on public.vip_coaching_records;
create policy "coaching staff delete" on public.vip_coaching_records for delete to authenticated using (public.tsc_is_staff());
