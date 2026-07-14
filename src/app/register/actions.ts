"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().trim().min(3),
  phone: z.string().trim().min(9),
  email: z.email(),
  password: z.string().min(8),
});

export async function register(formData: FormData) {
  const parsed = schema.safeParse({ fullName: formData.get("fullName"), phone: formData.get("phone"), email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) redirect(`/register?pesan=${encodeURIComponent("Periksa kembali data. Kata sandi minimal 8 karakter.")}`);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName, phone: parsed.data.phone }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm` },
  });
  if (error) redirect(`/register?pesan=${encodeURIComponent(error.message)}`);
  if (data.session) redirect("/dashboard?pesan=Akun berhasil dibuat");
  redirect(`/login?pesan=${encodeURIComponent("Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.")}`);
}
