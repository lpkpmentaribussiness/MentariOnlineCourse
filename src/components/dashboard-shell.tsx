import Link from "next/link";
import { BadgeCheck, BookOpen, ClipboardCheck, GraduationCap, LayoutDashboard, LogOut, Settings2, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import type { UserRole } from "@/lib/auth";

const roleLabels: Record<UserRole, string> = { admin: "Admin", instructor: "Pengajar", participant: "Peserta" };

export function DashboardShell({ children, profile }: { children: React.ReactNode; profile: { full_name: string; email: string; role: UserRole } }) {
  const common = [{ href: "/dashboard", label: "Ringkasan", icon: LayoutDashboard }];
  const participant = [{ href: "/dashboard#kursus-saya", label: "Kursus saya", icon: BookOpen }, { href: "/dashboard#sertifikat", label: "Sertifikat", icon: BadgeCheck }];
  const staff = [{ href: "/dashboard/penilaian", label: "Penilaian", icon: ClipboardCheck }, { href: "/dashboard/admin/kursus", label: "Kursus & materi", icon: GraduationCap }];
  const admin = [{ href: "/dashboard/admin/peserta", label: "Peserta", icon: UsersRound }, { href: "/dashboard/admin/kursus", label: "Kursus & materi", icon: GraduationCap }, { href: "/dashboard/admin/sertifikat", label: "Sertifikat", icon: BadgeCheck }];
  const nav = [...common, ...(profile.role === "participant" ? participant : staff), ...(profile.role === "admin" ? admin : [])];

  return <div className="dashboard-frame"><aside className="dashboard-sidebar"><BrandMark inverse /><nav aria-label="Navigasi dashboard">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href}><Icon size={18} />{label}</Link>)}</nav><div className="sidebar-bottom"><div className="profile-chip"><span>{profile.full_name.slice(0, 1).toUpperCase()}</span><div><strong>{profile.full_name}</strong><small>{roleLabels[profile.role]}</small></div></div><form action="/auth/signout" method="post"><button title="Keluar" aria-label="Keluar"><LogOut size={18} /></button></form></div></aside><div className="dashboard-content"><header className="dashboard-topbar"><div><span>{roleLabels[profile.role]}</span><strong>{profile.email}</strong></div><Link href="/" className="icon-link" title="Lihat website"><Settings2 size={18} /><span>Website</span></Link></header><main className="dashboard-main">{children}</main></div></div>;
}
