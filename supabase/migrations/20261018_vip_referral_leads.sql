-- A lead is one referred person, potentially interested in several TSC offerings.
create table if not exists public.vip_referral_leads (
 id uuid primary key default gen_random_uuid(),
 referrer_member_id uuid not null references public.vip_members(id) on delete cascade,
 lead_code text not null,
 display_name text not null default '',
 first_referred_at date not null default current_date,
 interest_coffee boolean not null default false,
 interest_positioning boolean not null default false,
 interest_vip boolean not null default false,
 coffee_stage text not null default '未參加' check (coffee_stage in ('未參加','已邀約','已報名','已參加')),
 positioning_stage text not null default '未參加' check (positioning_stage in ('未參加','已邀約','已報名','已參加')),
 vip_stage text not null default '未加入' check (vip_stage in ('未加入','洽談中','已加入')),
 notes text not null default '',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (referrer_member_id,lead_code),
 constraint lead_code_nonblank check(length(trim(lead_code))>0)
);
alter table public.vip_referral_leads enable row level security;
drop policy if exists "leads staff select" on public.vip_referral_leads;
create policy "leads staff select" on public.vip_referral_leads for select to authenticated using(public.tsc_is_staff());
drop policy if exists "leads staff insert" on public.vip_referral_leads;
create policy "leads staff insert" on public.vip_referral_leads for insert to authenticated with check(public.tsc_is_staff());
drop policy if exists "leads staff update" on public.vip_referral_leads;
create policy "leads staff update" on public.vip_referral_leads for update to authenticated using(public.tsc_is_staff()) with check(public.tsc_is_staff());
-- No VIP SELECT access, and no contact information required.
