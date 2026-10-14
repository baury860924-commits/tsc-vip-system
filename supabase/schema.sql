-- 在 Supabase SQL Editor 執行。先於 Authentication 建立管理員帳號，再將其 user id 寫入 admins。
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz not null default now());
create table if not exists public.members (id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), company text, industry text, contract_start date, contract_end date, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), constraint valid_dates check(contract_start is null or contract_end is null or contract_end>=contract_start));
alter table public.admins enable row level security;
alter table public.members enable row level security;
revoke all on public.admins from anon;
revoke all on public.members from anon;
create policy "admin can read own authorization" on public.admins for select to authenticated using (user_id=auth.uid());
create policy "admins can read members" on public.members for select to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admins can insert members" on public.members for insert to authenticated with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
create policy "admins can update members" on public.members for update to authenticated using (exists(select 1 from public.admins a where a.user_id=auth.uid())) with check (exists(select 1 from public.admins a where a.user_id=auth.uid()));
-- 管理員初始化必須由資料庫擁有者在 SQL Editor 執行，勿把 service_role key 放到前端或 GitHub。
-- insert into public.admins(user_id) values ('替換成 Authentication Users 的 UUID');
