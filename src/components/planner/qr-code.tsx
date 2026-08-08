"use client";

import { useMemo } from "react";
import qrcode from "qrcode-generator";

/**
 * Renders a QR code as inline SVG.
 *
 * Drawn from the module grid rather than the library's own SVG output so it can
 * use theme colours and stay crisp at any size.
 */
export function QrCode({
  value,
  size = 180,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const path = useMemo(() => {
    // type 0 picks the smallest version that fits; M tolerates ~15% damage
    const qr = qrcode(0, "M");
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    let d = "";
    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (qr.isDark(row, col)) d += `M${col},${row}h1v1h-1z`;
      }
    }
    return { d, count };
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${path.count} ${path.count}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`QR code for ${value}`}
      shapeRendering="crispEdges"
    >
      <rect width={path.count} height={path.count} fill="#ffffff" />
      <path d={path.d} fill="#000000" />
    </svg>
  );
}
