-- TSC VIP consultation requests: internal admin MVP.
create table if not exists public.vip_consultations (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.vip_members(id) on delete cascade,
 category text not null default '商業經營',
 subject text not null,
 description text not null default '',
 priority text not null default '一般' check(priority in ('一般','重要','緊急')),
 preferred_method text not null default '不拘' check(preferred_method in ('電話','視訊','實體','不拘')),
 status text not null default '待處理' check(status in ('待處理','安排中','處理中','待追蹤','已完成')),
 internal_note text not null default '',
 follow_up_date date,
 created_by uuid references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.vip_consultations enable row level security;
drop policy if exists "consultation staff select" on public.vip_consultations;
create policy "consultation staff select" on public.vip_consultations for select to authenticated using(public.tsc_is_staff());
drop policy if exists "consultation staff insert" on public.vip_consultations;
create policy "consultation staff insert" on public.vip_consultations for insert to authenticated with check(public.tsc_is_staff());
drop policy if exists "consultation staff update" on public.vip_consultations;
create policy "consultation staff update" on public.vip_consultations for update to authenticated using(public.tsc_is_staff()) with check(public.tsc_is_staff());
-- No VIP access to internal consultation notes until a separate safe member-facing interface is implemented.
