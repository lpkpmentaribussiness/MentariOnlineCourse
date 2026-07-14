import Link from "next/link";
import { ArrowRight, BadgeCheck, LogIn } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { getCurrentProfile } from "@/lib/auth";

export async function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  const profile = await getCurrentProfile();
  return (
    <header className={`site-header ${inverse ? "site-header-inverse" : ""}`}>
      <div className="site-header-inner">
        <BrandMark inverse={inverse} />
        <nav className="public-nav" aria-label="Navigasi utama">
          <Link href="/#kursus">Kursus</Link>
          <Link href="/#cara-belajar">Cara belajar</Link>
          <Link href="/cek-sertifikat"><BadgeCheck size={17} /> Cek sertifikat</Link>
        </nav>
        <Link className={inverse ? "button button-light" : "button button-dark"} href={profile ? "/dashboard" : "/login"}>
          {profile ? <>Dashboard <ArrowRight size={17} /></> : <><LogIn size={17} /> Masuk</>}
        </Link>
      </div>
    </header>
  );
}
