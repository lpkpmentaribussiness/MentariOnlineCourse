import { Download, FileCheck2 } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { gradeSubmission } from "../actions";

export default async function GradingPage({ searchParams }: { searchParams: Promise<{ pesan?: string; error?: string; status?: string }> }) {
  await requireProfile(["admin", "instructor"]); const { pesan, error, status } = await searchParams; const supabase = await createClient();
  let query = supabase.from("submissions").select("id, file_path, file_name, status, feedback, submitted_at, profiles!submissions_user_id_fkey(full_name), lessons(title, application), enrollments(courses(title))").order("submitted_at", { ascending: false });
  const validStatus = status === "submitted" || status === "revision" || status === "passed" ? status : null;
  if (validStatus) query = query.eq("status", validStatus);
  const { data: submissions } = await query;
  const rows = await Promise.all((submissions ?? []).map(async (submission) => { const { data } = await supabase.storage.from("submissions").createSignedUrl(submission.file_path, 900); return { ...submission, downloadUrl: data?.signedUrl }; }));
  return <div><header className="dashboard-heading"><p className="eyebrow">Ruang pengajar</p><h1>Penilaian ujian</h1><p>Unduh hasil kerja, periksa, lalu tetapkan status Lulus atau Revisi.</p>{(pesan || error) && <div className={error ? "alert alert-error" : "alert alert-success"}>{error ?? pesan}</div>}</header><nav className="filter-tabs"><a href="/dashboard/penilaian">Semua</a><a href="?status=submitted">Menunggu</a><a href="?status=revision">Revisi</a><a href="?status=passed">Lulus</a></nav><div className="grading-list">{rows.map((submission) => { const participant = Array.isArray(submission.profiles) ? submission.profiles[0] : submission.profiles; const lesson = Array.isArray(submission.lessons) ? submission.lessons[0] : submission.lessons; return <article key={submission.id}><div className="grading-file"><FileCheck2 /><span><small>{lesson?.application} · {formatDate(submission.submitted_at)}</small><h2>{lesson?.title}</h2><p>{participant?.full_name} · {submission.file_name}</p></span><StatusPill status={submission.status} /></div><form action={gradeSubmission} className="grading-form"><input type="hidden" name="submissionId" value={submission.id} /><label>Status<select name="status" defaultValue={submission.status === "passed" ? "passed" : "revision"}><option value="passed">Lulus</option><option value="revision">Revisi</option></select></label><label>Catatan<textarea name="feedback" defaultValue={submission.feedback ?? ""} placeholder="Jelaskan koreksi atau apresiasi untuk peserta" rows={3} /></label><div>{submission.downloadUrl && <a className="button button-outline" href={submission.downloadUrl} target="_blank" rel="noreferrer"><Download size={17} /> Download file</a>}<SubmitButton>Simpan penilaian</SubmitButton></div></form></article>; })}{!rows.length && <div className="empty-state"><FileCheck2 /><h2>Tidak ada upload</h2><p>Belum ada pekerjaan peserta untuk filter ini.</p></div>}</div></div>;
}
