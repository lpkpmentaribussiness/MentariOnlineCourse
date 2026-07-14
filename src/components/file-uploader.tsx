"use client";

import { useState } from "react";
import { CheckCircle2, LoaderCircle, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const allowedExtensions = ["docx", "xlsx", "pptx", "pdf"];

export function FileUploader({ userId, enrollmentId, lessonId }: { userId: string; enrollmentId: string; lessonId: string }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function upload(formData: FormData) {
    const file = formData.get("file");
    if (!(file instanceof File) || !file.size) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.includes(extension)) return setMessage("Gunakan file DOCX, XLSX, PPTX, atau PDF.");
    if (file.size > 20 * 1024 * 1024) return setMessage("Ukuran file melebihi 20 MB.");
    setLoading(true); setMessage("");
    const supabase = createClient();
    const path = `${userId}/${lessonId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("submissions").upload(path, file, { upsert: false });
    if (uploadError) { setLoading(false); return setMessage(uploadError.message); }
    const { error } = await supabase.from("submissions").upsert({ enrollment_id: enrollmentId, lesson_id: lessonId, user_id: userId, file_path: path, file_name: file.name, status: "submitted", feedback: null, graded_by: null, graded_at: null, submitted_at: new Date().toISOString() }, { onConflict: "enrollment_id,lesson_id" });
    setLoading(false);
    if (error) return setMessage(error.message);
    setMessage("Upload berhasil. File menunggu penilaian pengajar.");
    window.location.reload();
  }

  return <form action={upload} className="upload-form"><label htmlFor={`file-${lessonId}`}><UploadCloud />Pilih file ujian</label><input id={`file-${lessonId}`} name="file" type="file" accept=".docx,.xlsx,.pptx,.pdf" required /><button className="button button-dark" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <CheckCircle2 />} Upload ujian</button>{message && <p>{message}</p>}<small>DOCX, XLSX, PPTX, atau PDF. Maksimal 20 MB.</small></form>;
}
