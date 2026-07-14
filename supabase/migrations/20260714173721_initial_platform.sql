create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'instructor', 'participant');
create type public.course_status as enum ('draft', 'active', 'inactive');
create type public.enrollment_status as enum ('pending', 'active', 'inactive');
create type public.payment_status as enum ('pending', 'verified', 'rejected');
create type public.submission_status as enum ('submitted', 'revision', 'passed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role public.user_role not null default 'participant',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text not null,
  description text not null,
  price integer not null check (price >= 0),
  level text not null,
  status public.course_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  application text not null check (application in ('Word', 'Excel', 'PowerPoint')),
  title text not null,
  description text not null default '',
  instructions text not null default '',
  video_url text,
  exercise_file_url text,
  position integer not null check (position > 0),
  is_exam boolean not null default false,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, position)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status public.enrollment_status not null default 'pending',
  activated_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount integer not null check (amount >= 0),
  status public.payment_status not null default 'pending',
  notes text,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  status public.submission_status not null default 'submitted',
  feedback text,
  graded_by uuid references public.profiles(id) on delete set null,
  graded_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  certificate_number text not null unique,
  participant_name_public text not null,
  program_name text not null,
  file_path text not null,
  issued_at date not null default current_date,
  issued_by uuid not null references public.profiles(id) on delete restrict,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  participant_name text not null,
  quote text not null,
  course_name text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create schema if not exists private;

create or replace function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_role() = 'admin'::public.user_role, false);
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_role() in ('admin'::public.user_role, 'instructor'::public.user_role), false);
$$;

create or replace function private.has_active_enrollment(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.enrollments
    where user_id = (select auth.uid())
      and course_id = target_course
      and status = 'active'::public.enrollment_status
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated;
revoke all on all functions in schema private from public;
grant execute on function private.current_role() to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_staff() to authenticated;
grant execute on function private.has_active_enrollment(uuid) to authenticated;

create or replace function public.admin_update_profile(
  target_user_id uuid,
  target_role public.user_role,
  target_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Admin access required';
  end if;

  update public.profiles
  set role = target_role, is_active = target_is_active, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_update_profile(uuid, public.user_role, boolean) from public, anon;
grant execute on function public.admin_update_profile(uuid, public.user_role, boolean) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  );
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons
for each row execute function public.set_updated_at();
create trigger enrollments_set_updated_at before update on public.enrollments
for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
for each row execute function public.set_updated_at();
create trigger submissions_set_updated_at before update on public.submissions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.payments enable row level security;
alter table public.submissions enable row level security;
alter table public.certificates enable row level security;
alter table public.testimonials enable row level security;

create policy "profiles_read_own_or_staff" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.is_staff()));
create policy "profiles_update_own_or_admin" on public.profiles
for update to authenticated
using ((select auth.uid()) = id or (select private.is_admin()))
with check ((select auth.uid()) = id or (select private.is_admin()));

create policy "courses_public_read_active" on public.courses
for select to anon, authenticated
using (status = 'active' or (select private.is_staff()));
create policy "courses_staff_insert" on public.courses
for insert to authenticated with check ((select private.is_staff()));
create policy "courses_staff_update" on public.courses
for update to authenticated
using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "courses_admin_delete" on public.courses
for delete to authenticated using ((select private.is_admin()));

create policy "lessons_preview_enrolled_or_staff_read" on public.lessons
for select to anon, authenticated
using (is_preview or (select private.has_active_enrollment(course_id)) or (select private.is_staff()));
create policy "lessons_staff_insert" on public.lessons
for insert to authenticated with check ((select private.is_staff()));
create policy "lessons_staff_update" on public.lessons
for update to authenticated
using ((select private.is_staff())) with check ((select private.is_staff()));
create policy "lessons_admin_delete" on public.lessons
for delete to authenticated using ((select private.is_admin()));

create policy "enrollments_read_own_or_staff" on public.enrollments
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "enrollments_participant_request" on public.enrollments
for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending');
create policy "enrollments_admin_update" on public.enrollments
for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "payments_read_own_or_admin" on public.payments
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "payments_participant_create" on public.payments
for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending');
create policy "payments_admin_update" on public.payments
for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "submissions_read_own_or_staff" on public.submissions
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_staff()));
create policy "submissions_participant_insert" on public.submissions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.enrollments e
    where e.id = enrollment_id
      and e.user_id = (select auth.uid())
      and e.status = 'active'
  )
  and exists (
    select 1 from public.lessons l
    where l.id = lesson_id and l.is_exam = true
  )
);
create policy "submissions_participant_or_staff_update" on public.submissions
for update to authenticated
using (user_id = (select auth.uid()) or (select private.is_staff()))
with check (user_id = (select auth.uid()) or (select private.is_staff()));

create policy "certificates_read_own_or_admin" on public.certificates
for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy "certificates_public_registry" on public.certificates
for select to anon
using (is_public = true);
create policy "certificates_admin_insert" on public.certificates
for insert to authenticated with check ((select private.is_admin()));
create policy "certificates_admin_update" on public.certificates
for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy "testimonials_public_read" on public.testimonials
for select to anon, authenticated using (is_published or (select private.is_admin()));
create policy "testimonials_admin_manage" on public.testimonials
for all to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

grant select on public.courses to anon, authenticated;
grant insert, update, delete on public.courses to authenticated;
grant select on public.lessons to anon, authenticated;
grant insert, update, delete on public.lessons to authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant select, insert, update on public.enrollments to authenticated;
grant select, insert, update on public.payments to authenticated;
grant select, insert, update on public.submissions to authenticated;
grant select, insert, update on public.certificates to authenticated;
grant select (certificate_number, participant_name_public, program_name, issued_at, is_public)
  on public.certificates to anon;
grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('submissions', 'submissions', false, 20971520, array[
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/pdf'
  ]),
  ('certificates', 'certificates', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "submission_files_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "submission_files_read_own_or_staff" on storage.objects
for select to authenticated
using (
  bucket_id = 'submissions'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_staff()))
);
create policy "submission_files_update_own" on storage.objects
for update to authenticated
using (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "certificate_files_admin_write" on storage.objects
for insert to authenticated
with check (bucket_id = 'certificates' and (select private.is_admin()));
create policy "certificate_files_read_owner_or_admin" on storage.objects
for select to authenticated
using (
  bucket_id = 'certificates'
  and ((storage.foldername(name))[1] = (select auth.uid())::text or (select private.is_admin()))
);

insert into public.courses (slug, title, short_description, description, price, level, status)
values
  (
    'office-dasar',
    'Microsoft Office Dasar',
    'Fondasi Word, Excel, dan PowerPoint untuk belajar, bekerja, dan melamar pekerjaan.',
    'Kuasai keterampilan inti Microsoft Office melalui video terarah, latihan praktis, enam ujian, bimbingan remote, dan sertifikat resmi LPKP MENTARI.',
    1500000,
    'Dasar',
    'active'
  ),
  (
    'office-lanjutan',
    'Microsoft Office Lanjutan',
    'Naikkan kemampuan dokumen, pengolahan data, dan presentasi ke level profesional.',
    'Pelajari teknik lanjutan Word, Excel, dan PowerPoint dengan tugas berbasis kasus kerja, penilaian pengajar, bimbingan remote, dan sertifikat resmi.',
    1500000,
    'Lanjutan',
    'active'
  );

with apps(application, app_order) as (
  values ('Word', 0), ('Excel', 1), ('PowerPoint', 2)
), materials(material_no) as (
  select generate_series(1, 6)
), course_rows as (
  select id, level from public.courses
)
insert into public.lessons (
  course_id, application, title, description, instructions, position, is_exam, is_preview
)
select
  c.id,
  a.application,
  a.application || ' ' || lower(c.level) || ' - Materi ' || m.material_no,
  'Video pembelajaran dan latihan praktik ' || a.application || ' tingkat ' || lower(c.level) || '.',
  'Ikuti video sampai selesai, praktikkan langkahnya, lalu simpan file latihan Anda.',
  (a.app_order * 8) + m.material_no,
  false,
  a.app_order = 0 and m.material_no = 1
from course_rows c
cross join apps a
cross join materials m;

with apps(application, app_order) as (
  values ('Word', 0), ('Excel', 1), ('PowerPoint', 2)
), exams(exam_no) as (
  values (1), (2)
), course_rows as (
  select id, level from public.courses
)
insert into public.lessons (
  course_id, application, title, description, instructions, position, is_exam, is_preview
)
select
  c.id,
  a.application,
  'Ujian ' || e.exam_no || ' - ' || a.application || ' ' || c.level,
  'Ujian praktik untuk mengukur penguasaan materi ' || a.application || '.',
  'Unduh instruksi, kerjakan sesuai ketentuan, lalu upload file .docx, .xlsx, .pptx, atau .pdf maksimal 20 MB.',
  (a.app_order * 8) + 6 + e.exam_no,
  true,
  false
from course_rows c
cross join apps a
cross join exams e;

create index enrollments_user_status_idx on public.enrollments(user_id, status);
create index lessons_course_position_idx on public.lessons(course_id, position);
create index submissions_status_submitted_idx on public.submissions(status, submitted_at desc);
create index certificates_number_public_idx on public.certificates(certificate_number) where is_public = true;
create index payments_status_created_idx on public.payments(status, created_at desc);
