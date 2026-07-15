import Link from "next/link";
import { ArrowRight, BadgeCheck, ClipboardCheck, Clock3, GraduationCap, UsersRound } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { requestEnrollment } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ pesan?: string; error?: string }> }) {
  const profile = await requireProfile();
  const { pesan, error } = await searchParams;
  const supabase = await createClient();

  if (profile.role === "admin") {
    const [participants, pending, submissions, activeEnrollments, exams, passedSubmissions, certificates] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "participant"),
      supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "submitted"),
      supabase.from("enrollments").select("id, course_id").eq("status", "active"),
      supabase.from("lessons").select("id, course_id").eq("is_exam", true),
      supabase.from("submissions").select("enrollment_id, lesson_id").eq("status", "passed"),
      supabase.from("certificates").select("enrollment_id"),
    ]);
    const issuedEnrollmentIds = new Set(certificates.data?.map((item) => item.enrollment_id));
    const eligibleCount = (activeEnrollments.data ?? []).filter((enrollment) => {
      if (issuedEnrollmentIds.has(enrollment.id)) return false;
      const examIds = new Set(exams.data?.filter((exam) => exam.course_id === enrollment.course_id).map((exam) => exam.id));
      if (!examIds.size) return false;
      const passedIds = new Set(passedSubmissions.data?.filter((submission) => submission.enrollment_id === enrollment.id).map((submission) => submission.lesson_id));
      return [...examIds].every((examId) => passedIds.has(examId));
    }).length;
    return <div><DashboardHeading eyebrow="Pusat kendali" title={`Selamat datang, ${profile.full_name.split(" ")[0]}`} description="Pantau operasional kursus dan tindak lanjuti pekerjaan yang menunggu." message={pesan} error={error} /><div className="metric-grid"><Metric icon={UsersRound} label="Total peserta" value={participants.count ?? 0} /><Metric icon={Clock3} label="Menunggu aktivasi" value={pending.count ?? 0} /><Metric icon={ClipboardCheck} label="Upload belum dinilai" value={submissions.count ?? 0} /><Metric icon={BadgeCheck} label="Sertifikat menunggu" value={eligibleCount} /></div><div className="action-grid"><ActionCard href="/dashboard/admin/peserta" icon={UsersRound} title="Verifikasi peserta" text="Aktifkan akses setelah pembayaran dikonfirmasi." /><ActionCard href="/dashboard/penilaian" icon={ClipboardCheck} title="Periksa ujian" text="Buka upload terbaru dan berikan status Lulus atau Revisi." /><ActionCard href="/dashboard/admin/sertifikat" icon={BadgeCheck} title="Terbitkan sertifikat" text="Pastikan seluruh ujian lulus lalu buat PDF bernomor unik." /></div></div>;
  }

  if (profile.role === "instructor") {
    const { count } = await supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", "submitted");
    const { data: recent } = await supabase.from("submissions").select("id, file_name, submitted_at, profiles!submissions_user_id_fkey(full_name), lessons(title)").order("submitted_at", { ascending: false }).limit(6);
    return <div><DashboardHeading eyebrow="Ruang pengajar" title={`Halo, ${profile.full_name.split(" ")[0]}`} description="Materi dan pekerjaan peserta yang membutuhkan perhatian Anda." message={pesan} error={error} /><div className="metric-grid compact"><Metric icon={ClipboardCheck} label="Menunggu penilaian" value={count ?? 0} /><Metric icon={GraduationCap} label="Program aktif" value="2" /></div><section className="dashboard-section"><div className="dashboard-section-head"><div><p className="eyebrow">Upload terbaru</p><h2>Pekerjaan peserta</h2></div><Link className="button button-dark" href="/dashboard/penilaian">Buka penilaian <ArrowRight size={17} /></Link></div><div className="data-list">{recent?.map((item) => { const participant = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles; const lesson = Array.isArray(item.lessons) ? item.lessons[0] : item.lessons; return <div key={item.id}><span><strong>{participant?.full_name}</strong><small>{lesson?.title} · {item.file_name}</small></span><time>{formatDate(item.submitted_at)}</time></div>; })}</div></section></div>;
  }

  const [{ data: courses }, { data: enrollments }, { data: certificates }] = await Promise.all([
    supabase.from("courses").select("id, title, slug, short_description, level").eq("status", "active").order("level"),
    supabase.from("enrollments").select("id, course_id, status, created_at").eq("user_id", profile.id),
    supabase.from("certificates").select("id, certificate_number, program_name, issued_at, file_path").eq("user_id", profile.id).order("issued_at", { ascending: false }),
  ]);
  const signedCertificates = await Promise.all((certificates ?? []).map(async (certificate) => { const { data } = await supabase.storage.from("certificates").createSignedUrl(certificate.file_path, 900); return { ...certificate, signedUrl: data?.signedUrl }; }));
  const enrollmentByCourse = new Map((enrollments ?? []).map((enrollment) => [enrollment.course_id, enrollment]));

  return <div><DashboardHeading eyebrow="Dashboard peserta" title={`Halo, ${profile.full_name.split(" ")[0]}`} description="Lanjutkan kelas, pantau ujian, dan lihat sertifikat Anda." message={pesan} error={error} /><section className="dashboard-section" id="kursus-saya"><div className="dashboard-section-head"><div><p className="eyebrow">Program belajar</p><h2>Kursus Anda</h2></div></div><div className="student-course-grid">{courses?.map((course) => { const enrollment = enrollmentByCourse.get(course.id); return <article key={course.id}><div className="course-monogram">{course.level === "Dasar" ? "D" : "L"}</div><span>Microsoft Office · {course.level}</span><h3>{course.title}</h3><p>{course.short_description}</p>{enrollment ? <><StatusPill status={enrollment.status} />{enrollment.status === "active" ? <Link className="button button-dark" href={`/dashboard/kursus/${course.id}`}>Buka kursus <ArrowRight size={17} /></Link> : <a className="button button-outline" href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6281269288060"}?text=${encodeURIComponent(`Halo, saya ingin mengirim bukti pembayaran untuk ${course.title}.`)}`} target="_blank" rel="noreferrer">Kirim bukti via WhatsApp</a>}</> : <form action={requestEnrollment}><input type="hidden" name="courseId" value={course.id} /><SubmitButton>Ajukan akses <ArrowRight size={17} /></SubmitButton></form>}</article>; })}</div></section><section className="dashboard-section" id="sertifikat"><div className="dashboard-section-head"><div><p className="eyebrow">Dokumen kelulusan</p><h2>Sertifikat</h2></div></div>{signedCertificates.length ? <div className="certificate-list">{signedCertificates.map((certificate) => <div key={certificate.id}><BadgeCheck /><span><strong>{certificate.program_name}</strong><small>{certificate.certificate_number} · {formatDate(certificate.issued_at)}</small></span>{certificate.signedUrl && <a className="button button-outline" href={certificate.signedUrl} target="_blank" rel="noreferrer">Unduh PDF</a>}</div>)}</div> : <div className="empty-state"><BadgeCheck /><h3>Belum ada sertifikat</h3><p>Sertifikat diterbitkan admin setelah semua ujian wajib berstatus Lulus.</p></div>}</section></div>;
}

function DashboardHeading({ eyebrow, title, description, message, error }: { eyebrow: string; title: string; description: string; message?: string; error?: string }) { return <header className="dashboard-heading"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p>{(message || error) && <div className={error ? "alert alert-error" : "alert alert-success"}>{error ?? message}</div>}</header>; }
function Metric({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string | number }) { return <article className="metric-card"><Icon /><span>{label}</span><strong>{value}</strong></article>; }
function ActionCard({ href, icon: Icon, title, text }: { href: string; icon: typeof UsersRound; title: string; text: string }) { return <Link className="action-card" href={href}><Icon /><h3>{title}</h3><p>{text}</p><span>Kelola <ArrowRight size={16} /></span></Link>; }
