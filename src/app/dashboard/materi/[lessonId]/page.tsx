import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { BunnyVideoPlayer } from "@/components/bunny-video-player";
import { FileUploader } from "@/components/file-uploader";
import { StatusPill } from "@/components/status-pill";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const profile = await requireProfile(["participant"]); const { lessonId } = await params; const supabase = await createClient();
  const { data: lesson } = await supabase.from("lessons").select("id, course_id, application, title, description, instructions, video_url, exercise_file_url, is_exam").eq("id", lessonId).single();
  if (!lesson) return null;
  const { data: enrollment } = await supabase.from("enrollments").select("id").eq("user_id", profile.id).eq("course_id", lesson.course_id).eq("status", "active").single();
  const { data: submission } = enrollment ? await supabase.from("submissions").select("status, feedback, file_name, submitted_at").eq("enrollment_id", enrollment.id).eq("lesson_id", lesson.id).maybeSingle() : { data: null };
  return <div><Link href={`/dashboard/kursus/${lesson.course_id}`} className="back-link"><ArrowLeft size={17} /> Kembali ke daftar materi</Link><header className="dashboard-heading"><p className="eyebrow">{lesson.application} · {lesson.is_exam ? "Ujian" : "Materi"}</p><h1>{lesson.title}</h1><p>{lesson.description}</p></header><div className="lesson-detail-grid"><article className="lesson-player"><BunnyVideoPlayer url={lesson.video_url} title={lesson.title} emptyMessage="Video materi akan tampil di sini setelah link Bunny Stream ditambahkan pengajar." /><div><h2>Instruksi</h2><p>{lesson.instructions || "Ikuti materi sampai selesai dan praktikkan langkah-langkahnya di komputer Anda."}</p>{lesson.exercise_file_url && <a className="button button-outline" href={lesson.exercise_file_url}><Download size={17} /> Unduh file latihan</a>}</div></article>{lesson.is_exam && enrollment && <aside className="submission-panel"><p className="eyebrow">Pengumpulan ujian</p><h2>Upload hasil kerja</h2>{submission && <div className="current-submission"><StatusPill status={submission.status} /><strong>{submission.file_name}</strong>{submission.feedback && <p><b>Catatan pengajar:</b><br />{submission.feedback}</p>}</div>}<FileUploader userId={profile.id} enrollmentId={enrollment.id} lessonId={lesson.id} /></aside>}</div></div>;
}
