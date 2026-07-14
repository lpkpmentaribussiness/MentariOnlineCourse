import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Headphones,
  MonitorPlay,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { learningApps } from "@/lib/course-catalog";
import { formatCurrency } from "@/lib/format";
import { getPublicCourses } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const courses = await getPublicCourses();
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "6281269288060";

  return (
    <main>
      <section className="hero">
        <Image src="/images/hero-learning.png" alt="Peserta LPKP MENTARI belajar Microsoft Office melalui laptop" fill priority sizes="100vw" className="hero-image" />
        <div className="hero-shade" />
        <SiteHeader inverse />
        <div className="hero-content shell">
          <p className="eyebrow eyebrow-light">Kursus online resmi LPKP MENTARI</p>
          <h1>LPKP MENTARI<br />Online Course</h1>
          <p className="hero-lead">Belajar Microsoft Office secara terarah, diuji oleh pengajar, dan tuntaskan kompetensi Anda dengan sertifikat resmi.</p>
          <div className="hero-actions">
            <Link className="button button-accent" href="#kursus">Lihat paket kursus <ArrowRight size={18} /></Link>
            <Link className="button button-ghost-light" href="/cek-sertifikat"><BadgeCheck size={18} /> Cek sertifikat</Link>
          </div>
          <div className="hero-proof" aria-label="Ringkasan program">
            <span><strong>18</strong> materi per paket</span>
            <span><strong>6</strong> ujian praktik</span>
            <span><strong>1:1</strong> bantuan remote</span>
          </div>
        </div>
      </section>

      <section className="trust-band">
        <div className="shell trust-grid">
          <div><ShieldCheck /><span><strong>Lembaga resmi</strong><small>Sertifikat dapat divalidasi publik</small></span></div>
          <div><MonitorPlay /><span><strong>Belajar fleksibel</strong><small>Video dapat diakses dari mana saja</small></span></div>
          <div><ClipboardCheck /><span><strong>Dinilai pengajar</strong><small>Tugas menerima status dan catatan</small></span></div>
          <div><Headphones /><span><strong>Bimbingan manusia</strong><small>Bantuan WhatsApp dan AnyDesk</small></span></div>
        </div>
      </section>

      <section className="section shell" id="kursus">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Paket kursus MVP</p>
            <h2>Dua jalur. Satu standar kompetensi.</h2>
          </div>
          <p>Mulai dari fondasi atau lanjutkan ke teknik kerja profesional. Setiap paket mencakup Word, Excel, PowerPoint, ujian, bimbingan, dan sertifikat.</p>
        </div>
        <div className="course-list">
          {courses.map((course, index) => (
            <article className="course-card" key={course.slug}>
              <div className="course-index">0{index + 1}</div>
              <div className="course-main">
                <span className="course-level">Level {course.level}</span>
                <h3>{course.title}</h3>
                <p>{course.short_description}</p>
                <div className="app-row">
                  {learningApps.map((app) => <span key={app.name} className={app.color}><b>{app.mark}</b>{app.name}</span>)}
                </div>
              </div>
              <div className="course-meta">
                <span>18 materi + 6 ujian</span>
                <strong>{formatCurrency(Number(course.price))}</strong>
                <Link href={`/kursus/${course.slug}`} className="button button-dark">Detail kursus <ArrowRight size={17} /></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section process-section" id="cara-belajar">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow eyebrow-light">Cara belajar</p>
            <h2>Dari pendaftaran hingga sertifikat.</h2>
          </div>
          <ol className="process-grid">
            {[
              [BookOpenCheck, "Daftar & aktivasi", "Buat akun, pilih kursus, lalu kirim bukti transfer melalui WhatsApp."],
              [MonitorPlay, "Belajar terarah", "Tonton materi sesuai kebutuhan dan praktikkan langsung di komputer Anda."],
              [UploadCloud, "Upload ujian", "Kirim file Word, Excel, PowerPoint, atau PDF untuk dinilai pengajar."],
              [BadgeCheck, "Lulus & tersertifikasi", "Selesaikan semua ujian, lalu admin menerbitkan sertifikat digital."],
            ].map(([Icon, title, description], index) => {
              const StepIcon = Icon as typeof BookOpenCheck;
              return <li key={String(title)}><span className="step-number">0{index + 1}</span><StepIcon /><h3>{String(title)}</h3><p>{String(description)}</p></li>;
            })}
          </ol>
        </div>
      </section>

      <section className="section shell outcome-grid">
        <div className="outcome-copy">
          <p className="eyebrow">Belajar untuk hasil nyata</p>
          <h2>Keterampilan yang langsung dipakai.</h2>
          <p>Program dirancang untuk kebutuhan sekolah, kampus, pekerjaan, UMKM, dan administrasi sehari-hari.</p>
          <ul className="check-list">
            <li><Check /> Dokumen kerja yang rapi dan efisien</li>
            <li><Check /> Spreadsheet dan laporan yang akurat</li>
            <li><Check /> Presentasi yang jelas dan profesional</li>
            <li><Check /> Portofolio ujian praktik yang dinilai</li>
          </ul>
        </div>
        <div className="certificate-preview">
          <div className="certificate-seal"><BadgeCheck /></div>
          <p>LPKP MENTARI</p>
          <h3>Sertifikat Kompetensi</h3>
          <span>Microsoft Office</span>
          <div className="certificate-lines"><i /><i /><i /></div>
          <small>Nomor unik • Validasi publik • PDF digital</small>
        </div>
      </section>

      <section className="cta-band">
        <div className="shell cta-inner">
          <div><p className="eyebrow eyebrow-light">Pendaftaran dibuka</p><h2>Mulai langkah profesional Anda hari ini.</h2></div>
          <a className="button button-accent" href={`https://wa.me/${whatsapp}?text=${encodeURIComponent("Halo LPKP MENTARI, saya ingin mendaftar kursus Microsoft Office Online.")}`} target="_blank" rel="noreferrer">Daftar via WhatsApp <ArrowRight size={18} /></a>
        </div>
      </section>

      <footer className="site-footer">
        <div className="shell footer-grid">
          <div><strong>LPKP MENTARI</strong><p>Kursus online berbasis kompetensi untuk peserta di seluruh Indonesia.</p></div>
          <div><span>Program</span><Link href="/kursus/office-dasar">Office Dasar</Link><Link href="/kursus/office-lanjutan">Office Lanjutan</Link></div>
          <div><span>Akses</span><Link href="/login">Masuk peserta</Link><Link href="/cek-sertifikat">Cek sertifikat</Link></div>
          <div><span>Kontak</span><a href={`https://wa.me/${whatsapp}`}>WhatsApp LPKP MENTARI</a><p>lpkpmentari.id</p></div>
        </div>
      </footer>
    </main>
  );
}
