import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CirclePlay, FileCheck2, Headphones, LockKeyhole } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BunnyVideoPlayer } from "@/components/bunny-video-player";
import { learningApps } from "@/lib/course-catalog";
import { formatCurrency } from "@/lib/format";
import { getPublicCourse } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await getPublicCourse(slug);
  if (!result) notFound();
  const { course, previewLessons } = result;

  return (
    <main className="public-page">
      <SiteHeader />
      <section className="course-hero shell">
        <Link href="/#kursus" className="back-link"><ArrowLeft size={17} /> Semua kursus</Link>
        <div className="course-hero-grid">
          <div>
            <p className="eyebrow">Program {course.level}</p>
            <h1>{course.title}</h1>
            <p className="lead">{course.description}</p>
            <div className="app-row large">{learningApps.map((app) => <span key={app.name} className={app.color}><b>{app.mark}</b>{app.name}</span>)}</div>
          </div>
          <aside className="enroll-panel">
            <span>Investasi belajar</span>
            <strong>{formatCurrency(Number(course.price))}</strong>
            <ul><li><Check /> 18 materi video</li><li><Check /> 6 ujian praktik</li><li><Check /> Penilaian pengajar</li><li><Check /> Bimbingan remote</li><li><Check /> Sertifikat digital</li></ul>
            <Link href={`/register?kursus=${course.slug}`} className="button button-accent">Daftar sekarang <ArrowRight size={18} /></Link>
            <small>Pembayaran diverifikasi manual oleh admin.</small>
          </aside>
        </div>
      </section>

      <section className="section course-detail-band">
        <div className="shell detail-grid">
          <article><CirclePlay /><h2>Coba materi pertama gratis</h2><p>Kenali gaya belajar dan kualitas panduan sebelum mendaftar.</p>{previewLessons.length ? previewLessons.map((lesson) => <div className="preview-lesson" key={lesson.id}><span>{lesson.application}</span><strong>{lesson.title}</strong><BunnyVideoPlayer url={lesson.video_url} title={lesson.title} emptyMessage="Video preview siap dihubungkan ke Bunny Stream" /></div>) : <div className="video-placeholder"><CirclePlay /><span>Video preview siap dihubungkan ke Bunny Stream</span></div>}</article>
          <div className="feature-stack">
            <div><FileCheck2 /><span><strong>Ujian berbasis file</strong><small>DOCX, XLSX, PPTX, atau PDF hingga 20 MB</small></span></div>
            <div><Headphones /><span><strong>Dibimbing saat buntu</strong><small>WhatsApp, AnyDesk, dan audio dengan pengajar</small></span></div>
            <div><LockKeyhole /><span><strong>Akses khusus peserta</strong><small>Materi lengkap terbuka setelah pembayaran aktif</small></span></div>
          </div>
        </div>
      </section>
    </main>
  );
}
