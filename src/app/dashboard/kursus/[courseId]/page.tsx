import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, CirclePlay, FileUp, LockKeyhole } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StudentCoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const profile = await requireProfile(["participant"]); const { courseId } = await params; const supabase = await createClient();
  const { data: enrollment } = await supabase.from("enrollments").select("id, status, courses(title, description, level)").eq("user_id", profile.id).eq("course_id", courseId).eq("status", "active").maybeSingle();
  if (!enrollment) return <div className="empty-state"><LockKeyhole /><h2>Akses belum aktif</h2><p>Hubungi admin jika Anda sudah mengirim bukti pembayaran.</p><Link className="button button-dark" href="/dashboard">Kembali</Link></div>;
  const [{ data: lessons }, { data: submissions }] = await Promise.all([supabase.from("lessons").select("id, application, title, description, position, is_exam").eq("course_id", courseId).order("position"), supabase.from("submissions").select("lesson_id, status").eq("enrollment_id", enrollment.id)]);
  const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses; const byLesson = new Map((submissions ?? []).map((submission) => [submission.lesson_id, submission]));
  return <div><Link href="/dashboard" className="back-link"><ArrowLeft size={17} /> Dashboard</Link><header className="dashboard-heading"><p className="eyebrow">Microsoft Office · {course?.level}</p><h1>{course?.title}</h1><p>{course?.description}</p></header><div className="lesson-groups">{["Word", "Excel", "PowerPoint"].map((application) => <section key={application}><div className="lesson-group-head"><span className={`office-${application.toLowerCase() === "powerpoint" ? "powerpoint" : application.toLowerCase()}`}>{application[0]}</span><div><h2>{application}</h2><p>6 materi dan 2 ujian praktik</p></div></div><div className="lesson-list">{lessons?.filter((lesson) => lesson.application === application).map((lesson) => { const submission = byLesson.get(lesson.id); return <Link href={`/dashboard/materi/${lesson.id}`} key={lesson.id}><span className="lesson-icon">{lesson.is_exam ? <FileUp /> : submission?.status === "passed" ? <CheckCircle2 /> : <CirclePlay />}</span><span className="lesson-title"><small>{lesson.is_exam ? "Ujian praktik" : `Materi ${lesson.position}`}</small><strong>{lesson.title}</strong></span>{lesson.is_exam ? <StatusPill status={submission?.status} /> : <ArrowRight size={18} />}</Link>; })}</div></section>)}</div></div>;
}
