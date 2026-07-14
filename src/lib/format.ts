export function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function maskParticipantName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `${parts[0].slice(0, 2)}${"*".repeat(Math.max(parts[0].length - 2, 2))}`;
  return `${parts[0]} ${parts.slice(1).map((part) => `${part[0]}${"*".repeat(Math.max(part.length - 1, 2))}`).join(" ")}`;
}

export function submissionLabel(status?: string | null) {
  if (status === "passed") return "Lulus";
  if (status === "revision") return "Revisi";
  if (status === "submitted") return "Menunggu penilaian";
  return "Belum upload";
}
