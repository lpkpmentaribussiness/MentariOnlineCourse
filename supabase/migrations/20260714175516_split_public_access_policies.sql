drop policy if exists "courses_public_read_active" on public.courses;
create policy "courses_anon_read_active" on public.courses
for select to anon
using (status = 'active');
create policy "courses_authenticated_read" on public.courses
for select to authenticated
using (status = 'active' or (select private.is_staff()));

drop policy if exists "lessons_preview_enrolled_or_staff_read" on public.lessons;
create policy "lessons_anon_read_preview" on public.lessons
for select to anon
using (is_preview = true);
create policy "lessons_authenticated_read" on public.lessons
for select to authenticated
using (
  is_preview = true
  or (select private.has_active_enrollment(course_id))
  or (select private.is_staff())
);
