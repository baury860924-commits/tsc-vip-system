-- TSC: assign the two explicitly invited Gmail accounts as administrators.
-- Run in Supabase SQL Editor after sending invitations.
-- Does not create authentication accounts or bypass email verification.
do $$
declare missing_emails text;
begin
 select string_agg(e.email, ', ') into missing_emails
 from (values ('ruby810913@gmail.com'),('cinyu131419@gmail.com')) e(email)
 where not exists(select 1 from auth.users u where lower(u.email)=e.email);
 if missing_emails is not null then
  raise exception 'Invited users not found in Authentication: %',missing_emails;
 end if;
end $$;
insert into public.vip_profiles (user_id,role)
select u.id,'admin' from auth.users u
where lower(u.email) in ('ruby810913@gmail.com','cinyu131419@gmail.com')
on conflict (user_id) do update set role='admin';
insert into public.tsc_staff_directory(display_name,user_id,is_active)
select v.display_name,u.id,true from
 (values ('吳如虹','ruby810913@gmail.com'),('李心瑜','cinyu131419@gmail.com')) v(display_name,email)
join auth.users u on lower(u.email)=v.email
on conflict (display_name) do update
set user_id=excluded.user_id,is_active=true,updated_at=now();
select s.display_name,u.email,p.role,s.is_active from public.tsc_staff_directory s
join auth.users u on u.id=s.user_id
left join public.vip_profiles p on p.user_id=u.id
where lower(u.email) in ('ruby810913@gmail.com','cinyu131419@gmail.com');
