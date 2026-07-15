import { createHash } from "node:crypto";

const BUNNY_PLAYER_HOSTS = new Set(["player.mediadelivery.net", "iframe.mediadelivery.net"]);
const EMBED_PATH = /^\/embed\/(\d+)\/([0-9a-f-]{36})\/?$/i;

export function normalizeBunnyEmbedUrl(input: string | null | undefined) {
  if (!input?.trim()) return null;

  try {
    const url = new URL(input.trim());
    if (url.protocol !== "https:" || !BUNNY_PLAYER_HOSTS.has(url.hostname) || !EMBED_PATH.test(url.pathname)) return null;
    url.hostname = "player.mediadelivery.net";
    url.searchParams.delete("token");
    url.searchParams.delete("expires");
    return url.toString();
  } catch {
    return null;
  }
}

export function createBunnyPlaybackUrl(input: string | null | undefined, ttlSeconds = 3600) {
  const normalized = normalizeBunnyEmbedUrl(input);
  if (!normalized) return null;

  const tokenKey = process.env.BUNNY_STREAM_TOKEN_KEY?.trim();
  if (!tokenKey) return normalized;

  const url = new URL(normalized);
  const match = url.pathname.match(EMBED_PATH);
  if (!match) return null;

  const videoId = match[2];
  const expires = Math.floor(Date.now() / 1000) + ttlSeconds;
  const token = createHash("sha256").update(`${tokenKey}${videoId}${expires}`).digest("hex");
  url.searchParams.set("token", token);
  url.searchParams.set("expires", String(expires));
  return url.toString();
}
