import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "instructor" | "participant";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, is_active")
    .eq("id", authData.user.id)
    .single();

  if (!profile) return null;
  return { ...profile, email: authData.user.email ?? "" } as typeof profile & { email: string };
}

export async function requireProfile(roles?: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?pesan=Silakan masuk untuk melanjutkan");
  if (!profile.is_active) redirect("/login?pesan=Akun Anda sedang dinonaktifkan");
  if (roles && !roles.includes(profile.role as UserRole)) redirect("/dashboard");
  return profile;
}
