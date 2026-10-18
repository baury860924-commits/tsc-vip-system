alter table public.vip_referrals add column if not exists lead_id uuid references public.vip_referral_leads(id) on delete set null;
create index if not exists vip_referrals_lead_id_idx on public.vip_referrals(lead_id);
