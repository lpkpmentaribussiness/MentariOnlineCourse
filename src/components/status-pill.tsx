import { CircleAlert, CircleCheck, Clock3, PauseCircle } from "lucide-react";
import { submissionLabel } from "@/lib/format";

export function StatusPill({ status }: { status?: string | null }) {
  const label = status === "active" ? "Aktif" : status === "pending" ? "Menunggu" : status === "inactive" ? "Nonaktif" : submissionLabel(status);
  const icon = status === "active" || status === "passed" ? <CircleCheck size={14} /> : status === "revision" ? <CircleAlert size={14} /> : status === "inactive" ? <PauseCircle size={14} /> : <Clock3 size={14} />;
  return <span className={`status-pill status-${status ?? "empty"}`}>{icon}{label}</span>;
}
