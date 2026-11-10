begin;

drop policy if exists "funnel insert own" on public.vip_funnel_stages;
create policy "funnel insert own" on public.vip_funnel_stages for insert to authenticated
  with check (exists (
    select 1 from public.vip_members m where m.id = member_id and m.user_id = (select auth.uid())
  ));

drop policy if exists "funnel update own" on public.vip_funnel_stages;
create policy "funnel update own" on public.vip_funnel_stages for update to authenticated
  using (exists (
    select 1 from public.vip_members m where m.id = member_id and m.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.vip_members m where m.id = member_id and m.user_id = (select auth.uid())
  ));

commit;
