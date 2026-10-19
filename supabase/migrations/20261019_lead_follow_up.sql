-- Follow-up responsibility and contact outcome on each named lead.
alter table public.vip_referral_leads
  add column if not exists assigned_staff_name text,
  add column if not exists last_contact_date date,
  add column if not exists next_follow_up_date date,
  add column if not exists contact_result text;
create index if not exists vip_referral_leads_follow_up_date_idx
  on public.vip_referral_leads(next_follow_up_date);
