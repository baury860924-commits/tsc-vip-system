-- Add flexible pricing text to each member's individual funnel stage.
-- Supports multiple activity prices, free events, membership plans, and annual fees.
alter table public.vip_funnel_stages
 add column if not exists price_details text not null default '';
