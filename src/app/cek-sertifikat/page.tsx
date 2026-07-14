import { BadgeCheck, Search, ShieldAlert } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CertificateCheckPage({ searchParams }: { searchParams: Promise<{ nomor?: string }> }) {
  const { nomor = "" } = await searchParams;
  let certificate: { certificate_number: string; participant_name_public: string; program_name: string; issued_at: string; is_public: boolean } | null = null;
  if (nomor.trim()) {
    const supabase = await createClient();
    const { data } = await supabase.from("certificates").select("certificate_number, participant_name_public, program_name, issued_at, is_public").eq("certificate_number", nomor.trim()).eq("is_public", true).maybeSingle();
    certificate = data;
  }

  return (
    <main className="public-page certificate-page">
      <SiteHeader />
      <section className="certificate-check shell">
        <div className="section-heading centered"><p className="eyebrow">Validasi dokumen</p><h1>Cek sertifikat LPKP MENTARI</h1><p>Masukkan nomor lengkap yang tercantum pada sertifikat digital.</p></div>
        <form className="certificate-search" method="get"><label htmlFor="nomor">Nomor sertifikat</label><div><input id="nomor" name="nomor" defaultValue={nomor} placeholder="LPKPM/OFC-D/2026/0001" required /><button className="button button-dark"><Search size={18} /> Periksa</button></div></form>
        {nomor && (certificate ? <article className="verification-result valid"><BadgeCheck /><div><span>Sertifikat valid</span><h2>{certificate.program_name}</h2><dl><div><dt>Nomor</dt><dd>{certificate.certificate_number}</dd></div><div><dt>Nama peserta</dt><dd>{certificate.participant_name_public}</dd></div><div><dt>Tanggal lulus</dt><dd>{formatDate(certificate.issued_at)}</dd></div><div><dt>Lembaga</dt><dd>LPKP MENTARI</dd></div></dl></div></article> : <article className="verification-result invalid"><ShieldAlert /><div><span>Belum terverifikasi</span><h2>Sertifikat tidak ditemukan</h2><p>Periksa kembali penulisan nomor. Jika data tetap tidak ditemukan, hubungi admin LPKP MENTARI.</p></div></article>)}
      </section>
    </main>
  );
}
