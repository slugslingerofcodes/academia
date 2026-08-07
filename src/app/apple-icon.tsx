import { ImageResponse } from "next/og";

// iOS renders the home-screen icon at 180x180 and applies its own rounding
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
            width: 140,
            height: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 70,
            border: "5px solid #c9a227",
            color: "#e3c766",
            fontSize: 92,
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
