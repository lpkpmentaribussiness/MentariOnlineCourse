import Link from "next/link";
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { SubmitButton } from "@/components/submit-button";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ pesan?: string }> }) {
  const { pesan } = await searchParams;
  return <main className="auth-page"><section className="auth-context"><BrandMark inverse /><div><p className="eyebrow eyebrow-light">Ruang belajar peserta</p><h1>Lanjutkan progres Anda.</h1><p>Akses materi, kirim ujian, baca catatan pengajar, dan unduh sertifikat dari satu tempat.</p></div><Link href="/"><ArrowLeft size={17} /> Kembali ke beranda</Link></section><section className="auth-form-wrap"><form action={login} className="auth-form"><p className="eyebrow">Selamat datang kembali</p><h2>Masuk ke akun</h2><p>Gunakan email yang terdaftar di LPKP MENTARI.</p>{pesan && <div className="form-message">{pesan}</div>}<label htmlFor="email">Email</label><div className="input-icon"><Mail /><input id="email" name="email" type="email" autoComplete="email" required /></div><label htmlFor="password">Kata sandi</label><div className="input-icon"><LockKeyhole /><input id="password" name="password" type="password" autoComplete="current-password" minLength={8} required /></div><SubmitButton>Masuk</SubmitButton><p className="form-foot">Belum punya akun? <Link href="/register">Daftar peserta</Link></p></form></section></main>;
}
