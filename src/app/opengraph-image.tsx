import { ImageResponse } from "next/og";
import { site } from "@/lib/config";

export const dynamic = "force-dynamic";
export const size ={ width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = site.name;

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "radial-gradient(circle at 50% 0%, #3a2e0c 0%, #07080c 60%)",
          color: "white",
        }}
      >
        <div style={{ fontSize: 40, color: "#f4c542", fontWeight: 700 }}>{site.name}</div>
        <div style={{ fontSize: 76, fontWeight: 800, marginTop: 24, lineHeight: 1.05 }}>Rifas transparentes en RD</div>
        <div style={{ fontSize: 32, color: "#9aa0b4", marginTop: 28 }}>Boletos desde RD$5 · Sorteos verificables</div>
      </div>
    ),
    size,
  );
}
