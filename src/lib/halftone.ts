"use client";

/**
 * Engrave a photograph the way a newspaper would have.
 *
 * Before a press could print a photograph directly it broke the image into a
 * screen of dots — black ink or no ink, nothing in between. This does the same
 * thing with Floyd–Steinberg dithering, and gets two results at once: the
 * portrait looks like it belongs on a front page, and it shrinks from a hundred
 * kilobytes of photograph to a couple of kilobytes of black and white, which is
 * what makes storing it permanently on-chain affordable.
 *
 * It runs in the reader's browser. No image library on the server, and the
 * reader sees exactly what they are about to mint.
 */

export type Engraving = {
  /** 1-bit PNG as a data URI, ready to drop into an <image> in the SVG. */
  dataUri: string;
  /** Byte size of the PNG itself, for showing the on-chain cost honestly. */
  bytes: number;
};

/** Remote images are proxied so the canvas stays readable. */
function proxied(url: string): string {
  return url.startsWith("data:") ? url : `/api/portrait/proxy?url=${encodeURIComponent(url)}`;
}

function load(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("portrait failed to load"));
    img.src = proxied(url);
  });
}

/**
 * @param url    the portrait to engrave
 * @param size   square edge in pixels. 170 matches the cover plate.
 * @param weight <1 lightens the ink, >1 darkens it. 1.06 suits most faces.
 */
export async function engrave(url: string, size = 170, weight = 1.06): Promise<Engraving> {
  const img = await load(url);

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas context");

  // Square-crop from the centre, then scale to the plate.
  const s = Math.min(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);

  const image = ctx.getImageData(0, 0, size, size);
  const px = image.data;

  // Greyscale, with a gamma lift so faces do not close up into a black mass.
  const grey = new Float32Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    const l = 0.299 * px[o] + 0.587 * px[o + 1] + 0.114 * px[o + 2];
    grey[i] = Math.min(255, Math.pow(l / 255, 0.82) * 255 * weight);
  }

  // Floyd–Steinberg: each pixel goes fully black or fully white, and the error
  // is pushed into neighbours that have not been decided yet. That spreading is
  // what produces the dot screen rather than flat banding.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const old = grey[i];
      const next = old < 128 ? 0 : 255;
      grey[i] = next;
      const err = old - next;
      if (x + 1 < size)                grey[i + 1]            += (err * 7) / 16;
      if (y + 1 < size && x > 0)       grey[i + size - 1]     += (err * 3) / 16;
      if (y + 1 < size)                grey[i + size]         += (err * 5) / 16;
      if (y + 1 < size && x + 1 < size) grey[i + size + 1]    += (err * 1) / 16;
    }
  }

  for (let i = 0; i < size * size; i++) {
    const o = i * 4;
    const v = grey[i] < 128 ? 0 : 255;
    px[o] = px[o + 1] = px[o + 2] = v;
    px[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  const dataUri = canvas.toDataURL("image/png");
  // data:image/png;base64,XXXX — recover the true byte count from the base64.
  const b64 = dataUri.slice(dataUri.indexOf(",") + 1);
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);

  return { dataUri, bytes };
}
