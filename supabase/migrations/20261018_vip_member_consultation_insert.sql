-- VIP may submit consultation requests but cannot read internal notes or staff-only records.
-- This policy allows INSERT only; staff-only SELECT and UPDATE policies remain unchanged.
drop policy if exists "consultation vip self insert" on public.vip_consultations;
create policy "consultation vip self insert"
on public.vip_consultations for insert to authenticated
with check (
  exists (
    select 1 from public.vip_members m
    where m.id = member_id and m.user_id = (select auth.uid())
  )
  and created_by = (select auth.uid())
  and status = '待處理'
  and internal_note = ''
  and follow_up_date is null
);
-- VIP members receive no SELECT or UPDATE access to this table.
