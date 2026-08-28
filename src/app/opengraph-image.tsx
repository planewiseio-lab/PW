import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "PlaneWise.io — aircraft registration lookup";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const pin = await readFile(join(process.cwd(), "public/logo-pin.png"));
  const src = `data:image/png;base64,${pin.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f9fd",
          color: "#1a2330",
        }}
      >
        <img src={src} width={140} height={160} alt="" />
        <div
          style={{
            marginTop: 28,
            fontSize: 58,
            fontWeight: 800,
            color: "#1d80e6",
            letterSpacing: -1,
          }}
        >
          PlaneWise.io
        </div>
        <div style={{ marginTop: 14, fontSize: 26, color: "#6a7380" }}>
          Look up any aircraft registration
        </div>
      </div>
    ),
    { ...size },
  );
}
