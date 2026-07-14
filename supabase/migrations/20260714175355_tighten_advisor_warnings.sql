drop function if exists public.admin_update_profile(uuid, public.user_role, boolean);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

revoke update on public.profiles from authenticated;
grant update (full_name, phone, role, is_active) on public.profiles to authenticated;

drop policy if exists "testimonials_public_read" on public.testimonials;
drop policy if exists "testimonials_admin_manage" on public.testimonials;

create policy "testimonials_anon_read" on public.testimonials
for select to anon
using (is_published = true);

create policy "testimonials_authenticated_read" on public.testimonials
for select to authenticated
using (is_published = true or (select private.is_admin()));

create policy "testimonials_admin_insert" on public.testimonials
for insert to authenticated
with check ((select private.is_admin()));

create policy "testimonials_admin_update" on public.testimonials
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "testimonials_admin_delete" on public.testimonials
for delete to authenticated
using ((select private.is_admin()));
