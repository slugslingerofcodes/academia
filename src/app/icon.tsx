import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Home-screen / PWA icon. Drawn in code so no binary asset is needed. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16233d",
        }}
      >
        <div
          style={{
            width: 400,
            height: 400,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 200,
            border: "12px solid #c9a227",
            color: "#e3c766",
            fontSize: 260,
            fontWeight: 700,
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
