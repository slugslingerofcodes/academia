import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * Maskable variant: Android crops icons to a circle/squircle, so the monogram
 * is kept inside the safe zone (the middle ~80%) with a full-bleed background.
 */
export default function MaskableIcon() {
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
          color: "#e3c766",
          fontSize: 230,
          fontWeight: 700,
        }}
      >
        A
      </div>
    ),
    { ...size }
  );
}
