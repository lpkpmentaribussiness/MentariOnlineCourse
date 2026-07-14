import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0c273d", color: "#ffffff", border: "2px solid #f3b516", fontSize: 21, fontWeight: 800 }}>
      M
    </div>,
    size,
  );
}
