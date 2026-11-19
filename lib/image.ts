// Shrinks a photo before upload. Phone photos are often 3–8 MB; the AI only
// needs ~1600 px, and a smaller upload is much faster on mobile data.

export const MAX_EDGE = 1600;
export const JPEG_QUALITY = 0.85;

/** Size that fits inside `max` on the long edge, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** Returns a JPEG data URL no larger than MAX_EDGE; falls back to the original. */
export async function downscaleImage(file: File): Promise<string> {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  try {
    const img = new Image();
    img.src = original;
    await img.decode();

    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;

    // White background so transparent PNGs don't turn black as JPEG.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const small = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return small.length < original.length ? small : original;
  } catch {
    // Formats the browser can't decode (e.g. some HEIC) are sent as-is.
    return original;
  }
}
