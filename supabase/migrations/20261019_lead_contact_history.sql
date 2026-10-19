create table if not exists public.vip_lead_contact_history (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid not null references public.vip_referral_leads(id) on delete cascade,
 contacted_on date not null default current_date,
 staff_name text not null,
 result text not null,
 next_follow_up_date date,
 created_at timestamptz not null default now()
);
create index if not exists vip_lead_contact_history_lead_idx on public.vip_lead_contact_history(lead_id,created_at desc);
alter table public.vip_lead_contact_history enable row level security;
drop policy if exists "Staff can read lead contact history" on public.vip_lead_contact_history;
create policy "Staff can read lead contact history" on public.vip_lead_contact_history for select to authenticated using (public.tsc_is_staff());
drop policy if exists "Staff can add lead contact history" on public.vip_lead_contact_history;
create policy "Staff can add lead contact history" on public.vip_lead_contact_history for insert to authenticated with check (public.tsc_is_staff());
