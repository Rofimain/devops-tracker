"use client";

import { useEffect, useState } from "react";

const SRC = "/branding/gmv-logo.jpg";
const CACHE_KEY = "gmv-brand-logo-dataurl-v1";

/** Piksel gelap (latar hitam) → putih; huruf merah tetap. */
function replaceDarkBackgroundWithWhite(imageData: ImageData) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    if (r < 52 && g < 52 && b < 52) {
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
    }
  }
  return imageData;
}

export function BrandLogo({
  width,
  height,
  className,
  priority,
}: {
  width: number;
  height: number;
  className?: string;
  /** Set true di atas fold (mis. login) */
  priority?: boolean;
}) {
  /** `null` = masih memproses (tampilkan placeholder putih, hindari kilas hitam) */
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        setDisplaySrc(cached);
        return;
      }
    } catch {
      /* private mode */
    }

    const img = new Image();
    if (priority && "fetchPriority" in img) {
      (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
    }
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = 420;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      replaceDarkBackgroundWithWhite(imageData);
      ctx.putImageData(imageData, 0, 0);
      let out: string;
      try {
        out = canvas.toDataURL("image/png");
      } catch {
        out = SRC;
      }
      setDisplaySrc(out);
      try {
        sessionStorage.setItem(CACHE_KEY, out);
      } catch {
        /* quota / private */
      }
    };
    img.onerror = () => setDisplaySrc(SRC);
    img.src = SRC;
  }, [priority]);

  if (displaySrc === null) {
    return (
      <div
        className={className}
        style={{ width, height, background: "#fff", borderRadius: 6 }}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={displaySrc}
      alt="PT. Global Media Visual"
      width={width}
      height={height}
      className={className}
      style={{ width, height, objectFit: "contain", display: "block" }}
      decoding="async"
    />
  );
}
