import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile } from "@/lib/auth";

export const runtime = "nodejs";

const requestSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

const bunnyVideoSchema = z.object({
  guid: z.string().uuid(),
});

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Sesi login tidak ditemukan" }, { status: 401 });
  if (!profile.is_active || !["admin", "instructor"].includes(profile.role)) {
    return NextResponse.json({ error: "Anda tidak memiliki akses upload video" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Judul video tidak valid" }, { status: 400 });

  const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim();
  const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim();
  if (!libraryId || !/^\d+$/.test(libraryId) || !apiKey) {
    return NextResponse.json({ error: "Upload Bunny Stream belum dikonfigurasi" }, { status: 503 });
  }

  const createResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      AccessKey: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: parsed.data.title }),
    cache: "no-store",
  });

  if (!createResponse.ok) {
    console.error("Bunny Stream create video failed", createResponse.status, await createResponse.text());
    return NextResponse.json({ error: "Bunny Stream gagal menyiapkan video" }, { status: 502 });
  }

  const video = bunnyVideoSchema.safeParse(await createResponse.json());
  if (!video.success) {
    console.error("Bunny Stream returned an invalid create-video response");
    return NextResponse.json({ error: "Respons Bunny Stream tidak valid" }, { status: 502 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const signature = createHash("sha256")
    .update(`${libraryId}${apiKey}${expiresAt}${video.data.guid}`)
    .digest("hex");

  return NextResponse.json(
    {
      endpoint: "https://video.bunnycdn.com/tusupload",
      libraryId,
      videoId: video.data.guid,
      expiresAt,
      signature,
      embedUrl: `https://player.mediadelivery.net/embed/${libraryId}/${video.data.guid}`,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
