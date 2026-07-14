import { DashboardShell } from "@/components/dashboard-shell";
import { requireProfile, type UserRole } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return <DashboardShell profile={{ ...profile, role: profile.role as UserRole }}>{children}</DashboardShell>;
}
