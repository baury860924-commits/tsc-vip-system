-- Add TSC funnel destinations without deleting historical VIP-to-VIP referrals.
alter table public.vip_referrals add column if not exists referral_type text not null default 'VIP 互相轉介紹';
alter table public.vip_referrals drop constraint if exists vip_referrals_referral_type_check;
alter table public.vip_referrals add constraint vip_referrals_referral_type_check
check (referral_type in ('咖啡聚會','藍海定位一日課','VIP 陪跑','VIP 互相轉介紹'));
alter table public.vip_referrals alter column recipient_member_id drop not null;
alter table public.vip_referrals drop constraint if exists referral_distinct_members;
alter table public.vip_referrals add constraint referral_distinct_members
check (recipient_member_id is null or referrer_member_id <> recipient_member_id);
alter table public.vip_referrals drop constraint if exists vip_referrals_destination_check;
alter table public.vip_referrals add constraint vip_referrals_destination_check
check ((referral_type = 'VIP 互相轉介紹' and recipient_member_id is not null)
 or (referral_type <> 'VIP 互相轉介紹' and recipient_member_id is null));
create index if not exists vip_referrals_type_idx on public.vip_referrals(referral_type);
