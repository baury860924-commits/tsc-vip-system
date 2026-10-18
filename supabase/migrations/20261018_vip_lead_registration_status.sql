-- Convert participation states to registration-based counting while retaining confirmed VIP joins.
alter table public.vip_referral_leads drop constraint if exists vip_referral_leads_coffee_stage_check;
alter table public.vip_referral_leads drop constraint if exists vip_referral_leads_positioning_stage_check;
alter table public.vip_referral_leads drop constraint if exists vip_referral_leads_vip_stage_check;
update public.vip_referral_leads set coffee_stage=case when coffee_stage in ('已報名','已參加') then '已報名' else '未報名' end,
 positioning_stage=case when positioning_stage in ('已報名','已參加') then '已報名' else '未報名' end,
 vip_stage=case when vip_stage in ('已加入','已報名') then vip_stage else '未報名' end;
alter table public.vip_referral_leads alter column coffee_stage set default '未報名';
alter table public.vip_referral_leads alter column positioning_stage set default '未報名';
alter table public.vip_referral_leads alter column vip_stage set default '未報名';
alter table public.vip_referral_leads add constraint vip_referral_leads_coffee_stage_check check(coffee_stage in ('未報名','已報名'));
alter table public.vip_referral_leads add constraint vip_referral_leads_positioning_stage_check check(positioning_stage in ('未報名','已報名'));
alter table public.vip_referral_leads add constraint vip_referral_leads_vip_stage_check check(vip_stage in ('未報名','已報名','已加入'));
