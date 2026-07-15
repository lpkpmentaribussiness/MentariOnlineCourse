"use server";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { maskParticipantName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function dashboardMessage(path: string, message: string, error = false): never {
  redirect(`${path}?${error ? "error" : "pesan"}=${encodeURIComponent(message)}`);
}

export async function requestEnrollment(formData: FormData) {
  const profile = await requireProfile(["participant"]);
  const courseId = value(formData, "courseId");
  const supabase = await createClient();
  const { data: existing } = await supabase.from("enrollments").select("id, status").eq("user_id", profile.id).eq("course_id", courseId).maybeSingle();
  if (existing) dashboardMessage("/dashboard", existing.status === "active" ? "Kursus ini sudah aktif" : "Permintaan akses sudah tercatat");
  const { data: course } = await supabase.from("courses").select("price").eq("id", courseId).single();
  const { error } = await supabase.from("enrollments").insert({ user_id: profile.id, course_id: courseId, status: "pending" });
  if (error) dashboardMessage("/dashboard", "Permintaan akses gagal disimpan", true);
  await supabase.from("payments").insert({ user_id: profile.id, course_id: courseId, amount: course?.price ?? 0, status: "pending" });
  dashboardMessage("/dashboard", "Permintaan akses tercatat. Kirim bukti transfer melalui WhatsApp.");
}

export async function updateEnrollment(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const enrollmentId = value(formData, "enrollmentId");
  const paymentId = value(formData, "paymentId");
  const status = z.enum(["pending", "active", "inactive"]).parse(value(formData, "status"));
  const requestedPaymentStatus = z.enum(["pending", "verified", "rejected"]).parse(value(formData, "paymentStatus"));
  const paymentStatus = status === "active" ? "verified" : requestedPaymentStatus;
  const paymentNotes = value(formData, "paymentNotes");
  const supabase = await createClient();
  if (status === "active" && !paymentId) dashboardMessage("/dashboard/admin/peserta", "Catatan pembayaran harus tersedia sebelum akses diaktifkan", true);

  if (paymentId) {
    const verified = paymentStatus === "verified";
    const { error: paymentError } = await supabase.from("payments").update({
      status: paymentStatus,
      notes: paymentNotes || null,
      verified_by: verified ? profile.id : null,
      verified_at: verified ? new Date().toISOString() : null,
    }).eq("id", paymentId);
    if (paymentError) dashboardMessage("/dashboard/admin/peserta", paymentError.message, true);
  }

  const payload = status === "active" ? { status, activated_by: profile.id, activated_at: new Date().toISOString() } : { status };
  const { error } = await supabase.from("enrollments").update(payload).eq("id", enrollmentId);
  if (error) dashboardMessage("/dashboard/admin/peserta", error.message, true);
  revalidatePath("/dashboard/admin/peserta");
  revalidatePath("/dashboard");
}

export async function updateParticipantProfile(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const userId = value(formData, "userId");
  const role = z.enum(["admin", "instructor", "participant"]).parse(value(formData, "role"));
  const isActive = value(formData, "isActive") === "true";
  if (userId === profile.id && (role !== "admin" || !isActive)) dashboardMessage("/dashboard/admin/peserta", "Admin yang sedang masuk tidak dapat menurunkan peran atau menonaktifkan akunnya sendiri", true);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role, is_active: isActive }).eq("id", userId);
  if (error) dashboardMessage("/dashboard/admin/peserta", error.message, true);
  revalidatePath("/dashboard/admin/peserta");
}

export async function updateCertificateVisibility(formData: FormData) {
  await requireProfile(["admin"]);
  const certificateId = value(formData, "certificateId");
  const isPublic = value(formData, "isPublic") === "true";
  const supabase = await createClient();
  const { error } = await supabase.from("certificates").update({ is_public: isPublic }).eq("id", certificateId);
  if (error) dashboardMessage("/dashboard/admin/sertifikat", error.message, true);
  dashboardMessage("/dashboard/admin/sertifikat", isPublic ? "Validasi publik sertifikat diaktifkan" : "Validasi publik sertifikat dinonaktifkan");
}

export async function gradeSubmission(formData: FormData) {
  const profile = await requireProfile(["admin", "instructor"]);
  const submissionId = value(formData, "submissionId");
  const status = z.enum(["revision", "passed"]).parse(value(formData, "status"));
  const feedback = value(formData, "feedback");
  const supabase = await createClient();
  const { error } = await supabase.from("submissions").update({ status, feedback: feedback || null, graded_by: profile.id, graded_at: new Date().toISOString() }).eq("id", submissionId);
  if (error) dashboardMessage("/dashboard/penilaian", error.message, true);
  revalidatePath("/dashboard/penilaian");
}

const courseSchema = z.object({ title: z.string().min(3), slug: z.string().regex(/^[a-z0-9-]+$/), shortDescription: z.string().min(10), description: z.string().min(20), price: z.coerce.number().int().nonnegative(), level: z.string().min(3), status: z.enum(["draft", "active", "inactive"]) });

export async function createCourse(formData: FormData) {
  const profile = await requireProfile(["admin", "instructor"]);
  const parsed = courseSchema.safeParse({ title: value(formData, "title"), slug: value(formData, "slug"), shortDescription: value(formData, "shortDescription"), description: value(formData, "description"), price: value(formData, "price"), level: value(formData, "level"), status: value(formData, "status") });
  if (!parsed.success) dashboardMessage("/dashboard/admin/kursus", "Data kursus belum lengkap atau slug tidak valid", true);
  const supabase = await createClient();
  const { error } = await supabase.from("courses").insert({ title: parsed.data.title, slug: parsed.data.slug, short_description: parsed.data.shortDescription, description: parsed.data.description, price: parsed.data.price, level: parsed.data.level, status: parsed.data.status, created_by: profile.id });
  if (error) dashboardMessage("/dashboard/admin/kursus", error.message, true);
  revalidatePath("/dashboard/admin/kursus");
}

export async function updateCourse(formData: FormData) {
  await requireProfile(["admin", "instructor"]);
  const parsed = courseSchema.safeParse({ title: value(formData, "title"), slug: value(formData, "slug"), shortDescription: value(formData, "shortDescription"), description: value(formData, "description"), price: value(formData, "price"), level: value(formData, "level"), status: value(formData, "status") });
  const courseId = value(formData, "courseId");
  if (!parsed.success) dashboardMessage(`/dashboard/admin/kursus/${courseId}`, "Data kursus belum lengkap atau slug tidak valid", true);
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ title: parsed.data.title, slug: parsed.data.slug, short_description: parsed.data.shortDescription, description: parsed.data.description, price: parsed.data.price, level: parsed.data.level, status: parsed.data.status }).eq("id", courseId);
  if (error) dashboardMessage(`/dashboard/admin/kursus/${courseId}`, error.message, true);
  dashboardMessage(`/dashboard/admin/kursus/${courseId}`, "Data kursus berhasil diperbarui");
}

export async function updateCourseStatus(formData: FormData) {
  await requireProfile(["admin", "instructor"]);
  const status = z.enum(["draft", "active", "inactive"]).parse(value(formData, "status"));
  const supabase = await createClient();
  const { error } = await supabase.from("courses").update({ status }).eq("id", value(formData, "courseId"));
  if (error) dashboardMessage("/dashboard/admin/kursus", error.message, true);
  revalidatePath("/dashboard/admin/kursus");
}

export async function createLesson(formData: FormData) {
  await requireProfile(["admin", "instructor"]);
  const application = z.enum(["Word", "Excel", "PowerPoint"]).parse(value(formData, "application"));
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").insert({
    course_id: value(formData, "courseId"), application, title: value(formData, "title"), description: value(formData, "description"), instructions: value(formData, "instructions"), video_url: value(formData, "videoUrl") || null, exercise_file_url: value(formData, "exerciseFileUrl") || null, position: Number(value(formData, "position")), is_exam: value(formData, "isExam") === "true", is_preview: value(formData, "isPreview") === "true",
  });
  if (error) dashboardMessage("/dashboard/admin/kursus", error.message, true);
  revalidatePath("/dashboard/admin/kursus");
}

export async function updateLesson(formData: FormData) {
  await requireProfile(["admin", "instructor"]);
  const lessonId = value(formData, "lessonId");
  const courseId = value(formData, "courseId");
  const application = z.enum(["Word", "Excel", "PowerPoint"]).parse(value(formData, "application"));
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").update({ application, title: value(formData, "title"), description: value(formData, "description"), instructions: value(formData, "instructions"), video_url: value(formData, "videoUrl") || null, exercise_file_url: value(formData, "exerciseFileUrl") || null, position: Number(value(formData, "position")), is_exam: value(formData, "isExam") === "true", is_preview: value(formData, "isPreview") === "true" }).eq("id", lessonId);
  if (error) dashboardMessage(`/dashboard/admin/kursus/${courseId}`, error.message, true);
  dashboardMessage(`/dashboard/admin/kursus/${courseId}`, "Materi berhasil diperbarui");
}

export async function issueCertificate(formData: FormData) {
  const profile = await requireProfile(["admin"]);
  const enrollmentId = value(formData, "enrollmentId");
  const certificateNumber = value(formData, "certificateNumber").toUpperCase();
  if (!/^LPKPM\/OFC-[DL]\/\d{4}\/\d{4}$/.test(certificateNumber)) dashboardMessage("/dashboard/admin/sertifikat", "Format nomor sertifikat tidak valid", true);
  const supabase = await createClient();
  const { data: enrollment, error: enrollmentError } = await supabase.from("enrollments").select("id, user_id, course_id, profiles!enrollments_user_id_fkey(full_name), courses(title)").eq("id", enrollmentId).eq("status", "active").single();
  if (enrollmentError || !enrollment) dashboardMessage("/dashboard/admin/sertifikat", "Enrollment aktif tidak ditemukan", true);
  const { data: exams } = await supabase.from("lessons").select("id").eq("course_id", enrollment.course_id).eq("is_exam", true);
  const { data: passed } = await supabase.from("submissions").select("lesson_id").eq("enrollment_id", enrollmentId).eq("status", "passed");
  if (!exams?.length || new Set(passed?.map((item) => item.lesson_id)).size < exams.length) dashboardMessage("/dashboard/admin/sertifikat", "Semua ujian wajib berstatus Lulus sebelum sertifikat diterbitkan", true);
  const participant = Array.isArray(enrollment.profiles) ? enrollment.profiles[0] : enrollment.profiles;
  const course = Array.isArray(enrollment.courses) ? enrollment.courses[0] : enrollment.courses;
  const fullName = participant?.full_name ?? "Peserta LPKP MENTARI";
  const courseTitle = course?.title ?? "Microsoft Office";

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([841.89, 595.28]);
  const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 22, y: 22, width: 797.89, height: 551.28, borderWidth: 2, borderColor: rgb(0.08, 0.20, 0.29) });
  page.drawRectangle({ x: 34, y: 34, width: 773.89, height: 527.28, borderWidth: 1, borderColor: rgb(0.85, 0.62, 0.05) });
  page.drawText("LPKP MENTARI", { x: 340, y: 518, size: 16, font: sansBold, color: rgb(0.05, 0.18, 0.26) });
  page.drawText("SERTIFIKAT KOMPETENSI", { x: 224, y: 440, size: 30, font: serif, color: rgb(0.05, 0.18, 0.26) });
  page.drawText("Diberikan kepada", { x: 365, y: 389, size: 11, font: sans, color: rgb(0.35, 0.40, 0.43) });
  const nameWidth = serif.widthOfTextAtSize(fullName, 27);
  page.drawText(fullName, { x: (841.89 - nameWidth) / 2, y: 344, size: 27, font: serif, color: rgb(0.05, 0.18, 0.26) });
  page.drawLine({ start: { x: 210, y: 330 }, end: { x: 632, y: 330 }, thickness: 1, color: rgb(0.75, 0.68, 0.42) });
  const programText = `telah menyelesaikan program ${courseTitle}`;
  const programWidth = sans.widthOfTextAtSize(programText, 13);
  page.drawText(programText, { x: (841.89 - programWidth) / 2, y: 296, size: 13, font: sans, color: rgb(0.2, 0.25, 0.29) });
  page.drawText(`Nomor: ${certificateNumber}`, { x: 70, y: 78, size: 10, font: sans, color: rgb(0.3, 0.35, 0.38) });
  page.drawText(`Diterbitkan: ${new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date())}`, { x: 585, y: 78, size: 10, font: sans, color: rgb(0.3, 0.35, 0.38) });
  const pdfBytes = await pdf.save();
  const filePath = `${enrollment.user_id}/${certificateNumber.replaceAll("/", "-")}.pdf`;
  const { error: uploadError } = await supabase.storage.from("certificates").upload(filePath, pdfBytes, { contentType: "application/pdf", upsert: false });
  if (uploadError) dashboardMessage("/dashboard/admin/sertifikat", uploadError.message, true);
  const { error } = await supabase.from("certificates").insert({ enrollment_id: enrollment.id, user_id: enrollment.user_id, course_id: enrollment.course_id, certificate_number: certificateNumber, participant_name_public: maskParticipantName(fullName), program_name: courseTitle, file_path: filePath, issued_by: profile.id, is_public: true });
  if (error) dashboardMessage("/dashboard/admin/sertifikat", error.message, true);
  dashboardMessage("/dashboard/admin/sertifikat", "Sertifikat PDF berhasil diterbitkan");
}
