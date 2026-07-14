import Link from "next/link";

export function BrandMark({ inverse = false, compact = false }: { inverse?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={`brand-mark ${inverse ? "brand-mark-inverse" : ""}`} aria-label="LPKP MENTARI Beranda">
      <span className="brand-symbol" aria-hidden="true"><span>M</span></span>
      {!compact && (
        <span className="brand-copy">
          <strong>LPKP MENTARI</strong>
          <small>Online Course</small>
        </span>
      )}
    </Link>
  );
}
