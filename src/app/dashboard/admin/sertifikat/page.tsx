import { BadgeCheck, Download, FileText, ShieldCheck } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { issueCertificate, updateCertificateVisibility } from "../../actions";

export default async function CertificatesAdminPage({ searchParams }: { searchParams: Promise<{ pesan?: string; error?: string }> }) {
  await requireProfile(["admin"]);
  const { pesan, error } = await searchParams;
  const supabase = await createClient();
  const [{ data: enrollments }, { data: exams }, { data: submissions }, { data: certificates }] = await Promise.all([
    supabase.from("enrollments").select("id, user_id, course_id, status, profiles!enrollments_user_id_fkey(full_name), courses(title, slug)").eq("status", "active"),
    supabase.from("lessons").select("id, course_id").eq("is_exam", true),
    supabase.from("submissions").select("enrollment_id, lesson_id, status").eq("status", "passed"),
    supabase.from("certificates").select("id, enrollment_id, certificate_number, program_name, participant_name_public, issued_at, is_public, file_path").order("issued_at", { ascending: false }),
  ]);
  const eligible = (enrollments ?? []).map((enrollment) => {
    const courseExams = exams?.filter((exam) => exam.course_id === enrollment.course_id) ?? [];
    const passed = new Set(submissions?.filter((submission) => submission.enrollment_id === enrollment.id).map((submission) => submission.lesson_id));
    return { ...enrollment, examCount: courseExams.length, passedCount: courseExams.filter((exam) => passed.has(exam.id)).length, issued: certificates?.some((certificate) => certificate.enrollment_id === enrollment.id) };
  }).filter((item) => !item.issued);
  const certificateRows = await Promise.all((certificates ?? []).map(async (certificate) => {
    const { data } = await supabase.storage.from("certificates").createSignedUrl(certificate.file_path, 900);
    return { ...certificate, downloadUrl: data?.signedUrl };
  }));

  return <div>
    <header className="dashboard-heading">
      <p className="eyebrow">Dokumen kelulusan</p><h1>Penerbitan sertifikat</h1>
      <p>Sistem hanya mengizinkan penerbitan ketika seluruh ujian wajib telah Lulus.</p>
      {(pesan || error) && <div className={error ? "alert alert-error" : "alert alert-success"}>{error ?? pesan}</div>}
    </header>
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><p className="eyebrow">Kelayakan</p><h2>Peserta aktif</h2></div></div>
      <div className="certificate-admin-list">{eligible.map((item) => {
        const participant = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
        const course = Array.isArray(item.courses) ? item.courses[0] : item.courses;
        const passedAll = item.examCount > 0 && item.passedCount === item.examCount;
        const code = course?.slug === "office-lanjutan" ? "OFC-L" : "OFC-D";
        return <article key={item.id}><div><ShieldCheck /><span><small>{course?.title}</small><h3>{participant?.full_name}</h3><p>{item.passedCount} dari {item.examCount} ujian Lulus</p></span></div>{passedAll ? <form action={issueCertificate}><input type="hidden" name="enrollmentId" value={item.id} /><label>Nomor sertifikat<input name="certificateNumber" placeholder={`LPKPM/${code}/${new Date().getFullYear()}/0001`} required /></label><SubmitButton><FileText size={17} /> Terbitkan PDF</SubmitButton></form> : <StatusPill status="revision" />}</article>;
      })}{!eligible.length && <div className="empty-state"><BadgeCheck /><h3>Belum ada kandidat baru</h3><p>Peserta akan muncul setelah enrollment aktif.</p></div>}</div>
    </section>
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><p className="eyebrow">Registry</p><h2>Sertifikat terbit</h2></div></div>
      <div className="certificate-list">{certificateRows.map((certificate) => <div key={certificate.id}>
        <BadgeCheck /><span><strong>{certificate.participant_name_public} · {certificate.program_name}</strong><small>{certificate.certificate_number} · {certificate.is_public ? "Validasi publik aktif" : "Validasi nonaktif"}</small></span>
        <div className="certificate-actions">
          {certificate.downloadUrl && <a className="icon-button" href={certificate.downloadUrl} target="_blank" rel="noreferrer" title="Unduh PDF" aria-label="Unduh PDF"><Download size={17} /></a>}
          <form action={updateCertificateVisibility}><input type="hidden" name="certificateId" value={certificate.id} /><input type="hidden" name="isPublic" value={String(!certificate.is_public)} /><SubmitButton className="button button-outline">{certificate.is_public ? "Nonaktifkan validasi" : "Aktifkan validasi"}</SubmitButton></form>
        </div>
      </div>)}</div>
    </section>
  </div>;
}
