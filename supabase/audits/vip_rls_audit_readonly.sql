-- TSC VIP: read-only Supabase RLS audit.
-- Execute in Supabase SQL Editor; this script makes NO changes.
-- Share the result tables with the developer before tightening any policies.
-- Part 1: relevant public tables and their RLS status.
select t.tablename, t.rowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.tablename) as policy_count
from pg_tables t
where t.schemaname='public'
  and (t.tablename like 'vip_%' or t.tablename like 'tsc_%')
order by t.tablename;

-- Part 2: policy details, including USING and WITH CHECK expressions.
select p.tablename,p.policyname,p.permissive,p.roles,p.cmd,p.qual,p.with_check
from pg_policies p
where p.schemaname='public'
  and (p.tablename like 'vip_%' or p.tablename like 'tsc_%')
order by p.tablename,p.policyname;

-- Part 3: exposed grants for anonymous and authenticated API clients.
select table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and (table_name like 'vip_%' or table_name like 'tsc_%')
  and grantee in ('anon','authenticated')
order by table_name,grantee,privilege_type;
