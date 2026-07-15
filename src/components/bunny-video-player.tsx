import { CirclePlay } from "lucide-react";
import { createBunnyPlaybackUrl } from "@/lib/bunny-stream";

export function BunnyVideoPlayer({ url, title, emptyMessage }: { url: string | null; title: string; emptyMessage: string }) {
  const playbackUrl = createBunnyPlaybackUrl(url);

  if (!playbackUrl) {
    return <div className="video-placeholder"><CirclePlay /><span>{emptyMessage}</span></div>;
  }

  return <iframe
    src={playbackUrl}
    title={title}
    loading="lazy"
    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
    referrerPolicy="strict-origin-when-cross-origin"
    allowFullScreen
  />;
}
