-- Track responsibility handoffs for named TSC leads.
-- Run once in Supabase SQL Editor. Existing lead records are not changed.
create table if not exists public.vip_lead_assignment_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.vip_referral_leads(id) on delete cascade,
  previous_staff_name text,
  new_staff_name text,
  changed_by_user_id uuid,
  changed_at timestamptz not null default now()
);
create index if not exists vip_lead_assignment_history_lead_idx
  on public.vip_lead_assignment_history (lead_id, changed_at desc);
alter table public.vip_lead_assignment_history enable row level security;
drop policy if exists "Staff can view lead assignment history" on public.vip_lead_assignment_history;
create policy "Staff can view lead assignment history"
  on public.vip_lead_assignment_history for select to authenticated
  using (public.tsc_is_staff());

-- Inserts happen only through the trigger, not from the browser.
create or replace function public.tsc_log_lead_assignment()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    if nullif(btrim(new.assigned_staff_name), '') is not null then
      insert into public.vip_lead_assignment_history
        (lead_id, previous_staff_name, new_staff_name, changed_by_user_id)
      values (new.id, null, nullif(btrim(new.assigned_staff_name), ''), auth.uid());
    end if;
  elsif nullif(btrim(old.assigned_staff_name), '') is distinct from
        nullif(btrim(new.assigned_staff_name), '') then
    insert into public.vip_lead_assignment_history
      (lead_id, previous_staff_name, new_staff_name, changed_by_user_id)
    values (
      new.id,
      nullif(btrim(old.assigned_staff_name), ''),
      nullif(btrim(new.assigned_staff_name), ''),
      auth.uid()
    );
  end if;
  return new;
end;
$$;
revoke all on function public.tsc_log_lead_assignment() from public;
drop trigger if exists tsc_lead_assignment_audit on public.vip_referral_leads;
create trigger tsc_lead_assignment_audit
  after insert or update of assigned_staff_name
  on public.vip_referral_leads
  for each row execute function public.tsc_log_lead_assignment();
