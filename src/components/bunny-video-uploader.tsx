"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, UploadCloud } from "lucide-react";
import { Upload } from "tus-js-client";

type UploadCredentials = {
  endpoint: string;
  libraryId: string;
  videoId: string;
  expiresAt: number;
  signature: string;
  embedUrl: string;
};

type ApiError = { error?: string };

const VIDEO_EXTENSION = /\.(4mv|amv|avi|flv|m4p|m4v|mkv|mov|mp4|mpeg|mpg|mxf|ogg|ts|vod|webm|wmv)$/i;
const UPLOAD_STORAGE_PREFIX = "mentari:bunny-upload:";

function uploadStorageKey(file: File) {
  return `${UPLOAD_STORAGE_PREFIX}${file.name}:${file.size}:${file.lastModified}`;
}

function readUploadCredentials(file: File) {
  try {
    const stored = localStorage.getItem(uploadStorageKey(file));
    if (!stored) return null;
    const credentials = JSON.parse(stored) as UploadCredentials;
    if (credentials.expiresAt <= Math.floor(Date.now() / 1000) + 60) {
      localStorage.removeItem(uploadStorageKey(file));
      return null;
    }
    return credentials;
  } catch {
    return null;
  }
}

export function BunnyVideoUploader({ defaultValue = "" }: { defaultValue?: string | null }) {
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<Upload | null>(null);
  const [videoUrl, setVideoUrl] = useState(defaultValue ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(defaultValue ? "Video terhubung" : "Belum ada video");
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const blockSubmitDuringUpload = (event: SubmitEvent) => {
      if (!uploading) return;
      event.preventDefault();
      setHasError(true);
      setMessage("Tunggu sampai upload video selesai");
    };
    form.addEventListener("submit", blockSubmitDuringUpload);
    return () => form.removeEventListener("submit", blockSubmitDuringUpload);
  }, [uploading]);

  function selectFile(selected: File | null) {
    setHasError(false);
    setProgress(0);
    if (!selected) {
      setFile(null);
      setMessage(videoUrl ? "Video terhubung" : "Belum ada video");
      return;
    }
    if (!selected.type.startsWith("video/") && !VIDEO_EXTENSION.test(selected.name)) {
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setHasError(true);
      setMessage("Format file video tidak didukung");
      return;
    }
    setFile(selected);
    setMessage(selected.name);
  }

  async function startUpload() {
    if (!file || uploading) return;
    setUploading(true);
    setHasError(false);
    setMessage("Menyiapkan upload...");

    try {
      const form = rootRef.current?.closest("form");
      const lessonTitle = form ? String(new FormData(form).get("title") ?? "").trim() : "";
      let result = readUploadCredentials(file);
      if (!result) {
        const response = await fetch("/api/admin/bunny-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: lessonTitle || file.name.replace(/\.[^.]+$/, "") }),
        });
        const responseBody = (await response.json()) as UploadCredentials & ApiError;
        if (!response.ok) throw new Error(responseBody.error || "Upload tidak dapat dimulai");
        result = responseBody;
        localStorage.setItem(uploadStorageKey(file), JSON.stringify(result));
      }

      const upload = new Upload(file, {
        endpoint: result.endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
        headers: {
          AuthorizationSignature: result.signature,
          AuthorizationExpire: String(result.expiresAt),
          LibraryId: result.libraryId,
          VideoId: result.videoId,
        },
        metadata: {
          filetype: file.type || "application/octet-stream",
          title: lessonTitle || file.name,
        },
        removeFingerprintOnSuccess: true,
        onProgress(bytesUploaded, bytesTotal) {
          setProgress(bytesTotal ? Math.round((bytesUploaded / bytesTotal) * 100) : 0);
          setMessage(`Mengunggah ${Math.round((bytesUploaded / bytesTotal) * 100)}%`);
        },
        onError(error) {
          setUploading(false);
          setHasError(true);
          setMessage(error.message || "Upload video gagal");
        },
        onSuccess() {
          localStorage.removeItem(uploadStorageKey(file));
          setVideoUrl(result.embedUrl);
          setProgress(100);
          setUploading(false);
          setHasError(false);
          setMessage("Upload selesai, video sedang diproses Bunny");
        },
      });

      uploadRef.current = upload;
      const previousUploads = await upload.findPreviousUploads();
      if (previousUploads.length) upload.resumeFromPreviousUpload(previousUploads[0]);
      upload.start();
    } catch (error) {
      setUploading(false);
      setHasError(true);
      setMessage(error instanceof Error ? error.message : "Upload video gagal");
    }
  }

  return (
    <div ref={rootRef} className="bunny-upload-field span-2">
      <div className="bunny-upload-head">
        <span>Video Bunny Stream</span>
        <strong className={hasError ? "is-error" : videoUrl ? "is-connected" : ""}>
          {uploading ? <LoaderCircle size={14} className="spin" /> : videoUrl ? <CheckCircle2 size={14} /> : null}
          {message}
        </strong>
      </div>
      <div className="bunny-upload-controls">
        <label htmlFor={inputId} className="bunny-file-picker">
          <UploadCloud size={19} />
          <span>{file ? file.name : videoUrl ? "Pilih video pengganti" : "Pilih file video"}</span>
        </label>
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          accept="video/*,.mkv,.m4v,.4mv,.amv,.mxf,.ts,.vod"
          disabled={uploading}
          onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
        />
        <button type="button" className="button button-dark" disabled={!file || uploading} onClick={startUpload}>
          {uploading ? <LoaderCircle size={17} className="spin" /> : <UploadCloud size={17} />}
          {uploading ? "Mengunggah" : "Upload video"}
        </button>
      </div>
      {(uploading || progress > 0) && (
        <div className="bunny-upload-progress" role="progressbar" aria-label="Progres upload video" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <label className="bunny-url-fallback">
        URL Bunny Stream
        <input name="videoUrl" type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://player.mediadelivery.net/embed/..." />
      </label>
    </div>
  );
}
