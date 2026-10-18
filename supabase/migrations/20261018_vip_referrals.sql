-- Admin-managed VIP referrals. No sensitive lead contact details in MVP.
create table if not exists public.vip_referrals (
 id uuid primary key default gen_random_uuid(),
 referrer_member_id uuid not null references public.vip_members(id) on delete cascade,
 recipient_member_id uuid not null references public.vip_members(id) on delete cascade,
 referral_date date not null default current_date,
 lead_label text not null default '',
 summary text not null default '',
 status text not null default '已介紹'
   check (status in ('已介紹','已聯繫','洽談中','已成交','未成交')),
 follow_up_date date,
 internal_note text not null default '',
 created_by uuid references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint referral_distinct_members check (referrer_member_id <> recipient_member_id)
);
create index if not exists vip_referrals_recipient_idx on public.vip_referrals(recipient_member_id);
create index if not exists vip_referrals_referrer_idx on public.vip_referrals(referrer_member_id);
alter table public.vip_referrals enable row level security;
drop policy if exists "referral staff select" on public.vip_referrals;
create policy "referral staff select" on public.vip_referrals
 for select to authenticated using (public.tsc_is_staff());
drop policy if exists "referral staff insert" on public.vip_referrals;
create policy "referral staff insert" on public.vip_referrals
 for insert to authenticated with check (public.tsc_is_staff());
drop policy if exists "referral staff update" on public.vip_referrals;
create policy "referral staff update" on public.vip_referrals
 for update to authenticated using (public.tsc_is_staff()) with check (public.tsc_is_staff());
drop policy if exists "referral staff delete" on public.vip_referrals;
create policy "referral staff delete" on public.vip_referrals
 for delete to authenticated using (public.tsc_is_staff());
-- VIP accounts do not have access to referral records until an explicit sharing policy exists.
