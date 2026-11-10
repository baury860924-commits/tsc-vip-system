begin;

create or replace function public.tsc_can_manage_member(p_member uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.vip_profiles p where p.user_id = auth.uid() and
      (p.role = 'admin' or (p.role = 'staff' and exists (
        select 1 from public.tsc_staff_directory s
        join public.vip_staff_assignments a on a.staff_user_id = s.user_id
        where s.user_id = p.user_id and s.is_active and a.ended_at is null and a.member_id = p_member
      )))
  )
$$;
revoke all on function public.tsc_can_manage_member(uuid) from public;
grant execute on function public.tsc_can_manage_member(uuid) to authenticated;

create table if not exists public.vip_member_followups (
  member_id uuid primary key references public.vip_members(id) on delete cascade,
  birthday date,
  contact text not null default '',
  line_id text not null default '',
  followup_light text not null default '未評估' check (followup_light in ('未評估','綠燈','黃燈','紅燈')),
  next_followup date,
  next_action text not null default ''
);
create table if not exists public.vip_member_documents (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.vip_members(id) on delete cascade,
  kind text not null check (kind in ('逐字稿','合約','錄音檔','訪談細節')),
  label text not null check (length(btrim(label)) between 1 and 150),
  drive_url text not null check (length(drive_url) <= 2048 and drive_url ~ '^https://(drive|docs)\.google\.com/'),
  created_at timestamptz not null default now()
);
alter table public.vip_member_followups enable row level security;
alter table public.vip_member_documents enable row level security;
revoke all on public.vip_member_followups, public.vip_member_documents from anon, authenticated;
grant select, insert, update on public.vip_member_followups to authenticated;
grant select, insert, delete on public.vip_member_documents to authenticated;
drop policy if exists "Manage assigned followups" on public.vip_member_followups;
create policy "Manage assigned followups" on public.vip_member_followups for all to authenticated
  using (public.tsc_can_manage_member(member_id)) with check (public.tsc_can_manage_member(member_id));
drop policy if exists "Manage assigned documents" on public.vip_member_documents;
create policy "Manage assigned documents" on public.vip_member_documents for all to authenticated
  using (public.tsc_can_manage_member(member_id)) with check (public.tsc_can_manage_member(member_id));

drop policy if exists "funnel insert own" on public.vip_funnel_stages;
create policy "funnel insert own" on public.vip_funnel_stages for insert to authenticated
  with check (exists (select 1 from public.vip_members m where m.id = member_id and m.user_id = auth.uid()));
drop policy if exists "funnel update own" on public.vip_funnel_stages;
create policy "funnel update own" on public.vip_funnel_stages for update to authenticated
  using (exists (select 1 from public.vip_members m where m.id = member_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.vip_members m where m.id = member_id and m.user_id = auth.uid()));

alter table public.vip_directory add column if not exists line_url text not null default ''
  check (line_url = '' or (length(line_url) <= 500 and line_url ~ '^https://(line\.me|lin\.ee)/'));
drop policy if exists "directory read published or staff" on public.vip_directory;
create policy "directory read published or staff" on public.vip_directory for select to authenticated using (
  public.tsc_is_staff()
  or exists (select 1 from public.vip_members m where m.id = member_id and m.user_id = auth.uid())
  or (is_published and consent_confirmed and exists (select 1 from public.vip_members m where m.user_id = auth.uid()))
);
-- Check both the viewer's membership and the directory owner's publication consent.
drop policy if exists "funnel read published" on public.vip_funnel_stages;
create policy "funnel read published" on public.vip_funnel_stages for select to authenticated using (
  exists (select 1 from public.vip_directory d
    where d.member_id = vip_funnel_stages.member_id and d.is_published and d.consent_confirmed)
);

create or replace function public.vip_save_directory_preferences(p_line_url text, p_publish boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare m public.vip_members%rowtype;
begin
  select * into strict m from public.vip_members where user_id = auth.uid();
  insert into public.vip_directory(member_id, display_name, company, industry, line_url, is_published, consent_confirmed)
  values (m.id, m.name, m.company, m.industry, btrim(coalesce(p_line_url,'')), p_publish, p_publish)
  on conflict (member_id) do update
    set line_url = excluded.line_url, is_published = excluded.is_published,
        consent_confirmed = excluded.consent_confirmed, updated_at = now();
end
$$;
revoke all on function public.vip_save_directory_preferences(text, boolean) from public;
grant execute on function public.vip_save_directory_preferences(text, boolean) to authenticated;

alter table public.vip_consultations add column if not exists source text not null default '後台'
  check (source in ('後台','Google 表單'));
drop policy if exists "consultation vip self insert" on public.vip_consultations;
create policy "consultation vip self insert" on public.vip_consultations for insert to authenticated with check (
  exists (select 1 from public.vip_members m where m.id = member_id and m.user_id = auth.uid())
  and created_by = auth.uid() and source = '後台' and status = '待處理'
  and internal_note = '' and follow_up_date is null
);

create table if not exists public.vip_google_form_codes (
  token_hash bytea primary key,
  member_id uuid not null references public.vip_members(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  response_id text unique
);
create index if not exists vip_google_form_codes_member_idx on public.vip_google_form_codes(member_id,created_at);
alter table public.vip_google_form_codes enable row level security;
revoke all on public.vip_google_form_codes from anon, authenticated;

create or replace function public.vip_issue_google_form_code()
returns text language plpgsql security definer set search_path = ''
as $$
declare member uuid;
declare token text := gen_random_uuid()::text || gen_random_uuid()::text;
begin
  select id into strict member from public.vip_members where user_id = auth.uid() for update;
  delete from public.vip_google_form_codes
  where member_id = member and created_at < now() - interval '7 days' and response_id is null;
  if (select count(*) from public.vip_google_form_codes where member_id = member
        and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'too many codes';
  end if;
  insert into public.vip_google_form_codes(token_hash,member_id,user_id)
  values (sha256(convert_to(token,'UTF8')),member,auth.uid());
  return token;
end
$$;
revoke all on function public.vip_issue_google_form_code() from public;
grant execute on function public.vip_issue_google_form_code() to authenticated;

create or replace function public.vip_receive_google_form(
  p_code text, p_response_id text, p_category text, p_subject text,
  p_description text, p_priority text, p_method text
)
returns void language plpgsql security definer set search_path = ''
as $$
declare request public.vip_google_form_codes%rowtype;
begin
  if p_code is null or length(p_code) <> 72 or coalesce(length(p_response_id),0) not between 1 and 256
    or coalesce(length(btrim(p_subject)),0) not between 1 and 150
    or coalesce(length(p_description),0) > 3000
    or p_category is null or p_category not in ('商業經營','銷售漏斗','資源媒合','行銷品牌','其他')
    or p_priority is null or p_priority not in ('一般','重要','緊急')
    or p_method is null or p_method not in ('不拘','電話','視訊','實體') then
    raise exception 'invalid response';
  end if;
  select * into request from public.vip_google_form_codes
    where token_hash = sha256(convert_to(p_code,'UTF8')) for update;
  if not found then
    raise exception 'invalid code';
  end if;
  if request.response_id = p_response_id then return; end if;
  if request.response_id is not null or request.created_at < now() - interval '24 hours'
    or not exists (select 1 from public.vip_members m where m.id = request.member_id and m.user_id = request.user_id) then
    raise exception 'expired or used code';
  end if;
  insert into public.vip_consultations(member_id, category, subject, description, priority, preferred_method, created_by, source)
  values (request.member_id, p_category, btrim(p_subject), coalesce(btrim(p_description),''), p_priority, p_method, request.user_id, 'Google 表單');
  update public.vip_google_form_codes set response_id = p_response_id where token_hash = request.token_hash;
end
$$;
revoke all on function public.vip_receive_google_form(text,text,text,text,text,text,text) from public;
grant execute on function public.vip_receive_google_form(text,text,text,text,text,text,text) to anon, authenticated;

commit;
