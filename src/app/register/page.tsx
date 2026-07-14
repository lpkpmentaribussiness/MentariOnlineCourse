import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/submit-button";
import { register } from "./actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  return <main className="auth-page"><section className="auth-context"><BrandMark inverse /><div><p className="eyebrow eyebrow-light">Pendaftaran peserta</p><h1>Bangun keterampilan yang teruji.</h1><p>Buat akun, pilih paket, konfirmasi pembayaran, lalu mulai belajar setelah akses diaktifkan admin.</p></div><Link href="/"><ArrowLeft size={17} /> Kembali ke beranda</Link></section><section className="auth-form-wrap"><form action={register} className="auth-form"><p className="eyebrow">Akun baru</p><h2>Daftar peserta</h2><p>Isi data sesuai identitas untuk kebutuhan sertifikat.</p>{pesan && <div className="form-message">{pesan}</div>}<label htmlFor="fullName">Nama lengkap</label><div className="input-icon"><UserRound /><input id="fullName" name="fullName" autoComplete="name" required /></div><label htmlFor="phone">Nomor WhatsApp</label><div className="input-icon"><Phone /><input id="phone" name="phone" type="tel" autoComplete="tel" required /></div><label htmlFor="email">Email</label><div className="input-icon"><Mail /><input id="email" name="email" type="email" autoComplete="email" required /></div><label htmlFor="password">Kata sandi</label><div className="input-icon"><LockKeyhole /><input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required /></div><SubmitButton>Daftar akun</SubmitButton><p className="form-foot">Sudah punya akun? <Link href="/login">Masuk</Link></p></form></section></main>;
}
