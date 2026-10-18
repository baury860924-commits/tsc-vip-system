-- Public-facing VIP directory is separate from private vip_members.
-- No phone, email, contract, coaching or internal notes are copied.
create table if not exists public.vip_directory (
 member_id uuid primary key references public.vip_members(id) on delete cascade,
 display_name text not null,
 company text not null default '',
 industry text not null default '',
 introduction text not null default '',
 is_published boolean not null default false,
 consent_confirmed boolean not null default false,
 updated_at timestamptz not null default now(),
 constraint directory_requires_consent check (not is_published or consent_confirmed)
);
alter table public.vip_directory enable row level security;
drop policy if exists "directory read published or staff" on public.vip_directory;
create policy "directory read published or staff" on public.vip_directory
for select to authenticated using ((is_published and consent_confirmed) or public.tsc_is_staff());
drop policy if exists "directory staff insert" on public.vip_directory;
create policy "directory staff insert" on public.vip_directory
for insert to authenticated with check(public.tsc_is_staff());
drop policy if exists "directory staff update" on public.vip_directory;
create policy "directory staff update" on public.vip_directory
for update to authenticated using(public.tsc_is_staff()) with check(public.tsc_is_staff());
-- Expose only a member's deliberately published funnel content via a SECURITY INVOKER view.
-- Use the directory's published member IDs; no staff-private fields.
create or replace view public.vip_public_funnel with (security_invoker=true) as
select f.member_id, f.stage_number, f.title, f.description, f.goal, f.action_plan
from public.vip_funnel_stages f
join public.vip_directory d on d.member_id=f.member_id
where d.is_published and d.consent_confirmed;
-- VIP can read published members' funnel stages only (admin/staff already have access).
drop policy if exists "funnel read published" on public.vip_funnel_stages;
create policy "funnel read published" on public.vip_funnel_stages
for select to authenticated using (
 exists (select 1 from public.vip_directory d
 where d.member_id=vip_funnel_stages.member_id and d.is_published and d.consent_confirmed)
);
