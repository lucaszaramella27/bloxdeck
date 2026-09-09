import { useEffect, useState } from "react";

type ImageAccent = {
  accent: string;
  muted: string;
  soft: string;
};

const fallbackAccent: ImageAccent = {
  accent: "#3979e6",
  muted: "#172b50",
  soft: "rgba(57, 121, 230, 0.17)",
};

const accentCache = new Map<string, ImageAccent>();

export function useImageAccent(imageUrl: string | null | undefined) {
  const [accent, setAccent] = useState<ImageAccent>(fallbackAccent);

  useEffect(() => {
    if (!imageUrl) {
      setAccent(fallbackAccent);
      return;
    }

    const cached = accentCache.get(imageUrl);
    if (cached) {
      setAccent(cached);
      return;
    }

    let active = true;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      if (!active) return;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 20;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return;

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const buckets = Array.from({ length: 18 }, () => ({ weight: 0, hue: 0 }));

        for (let index = 0; index < pixels.length; index += 4) {
          if (pixels[index + 3] < 180) continue;
          const { saturation, lightness, hue } = rgbToHsl(
            pixels[index],
            pixels[index + 1],
            pixels[index + 2],
          );
          if (saturation < 0.18 || lightness < 0.12 || lightness > 0.9) continue;

          const weight = saturation ** 1.7 * (1 - Math.abs(lightness - 0.52));
          const bucket = buckets[Math.min(buckets.length - 1, Math.floor(hue * buckets.length))];
          bucket.weight += weight;
          bucket.hue += hue * weight;
        }

        const winner = buckets.reduce((best, candidate) =>
          candidate.weight > best.weight ? candidate : best,
        );
        if (!winner.weight) return;

        const hue = Math.round((winner.hue / winner.weight) * 360);
        const sourceAccent = `hsl(${hue} 56% 58%)`;
        const palette = {
          accent: `color-mix(in oklab, #3979e6 82%, ${sourceAccent})`,
          muted: `color-mix(in oklab, #172b50 86%, hsl(${hue} 28% 22%))`,
          soft: `color-mix(in srgb, ${sourceAccent} 4%, rgba(57, 121, 230, 0.17))`,
        } satisfies ImageAccent;

        accentCache.set(imageUrl, palette);
        if (active) setAccent(palette);
      } catch {
        if (active) setAccent(fallbackAccent);
      }
    };

    image.onerror = () => {
      if (active) setAccent(fallbackAccent);
    };
    image.src = imageUrl;

    return () => {
      active = false;
    };
  }, [imageUrl]);

  return accent;
}

function rgbToHsl(red: number, green: number, blue: number) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;

  if (!delta) return { saturation: 0, lightness, hue: 0 };

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;

  hue = ((hue * 60 + 360) % 360) / 360;
  return { saturation, lightness, hue };
}
