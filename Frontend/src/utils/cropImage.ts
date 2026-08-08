interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', reject);
    img.src = src;
  });
}

// Avatars are never displayed larger than a small circle anywhere in the
// app, so cap the exported resolution regardless of how large the source
// photo was — this is a ceiling, not a forced size: a crop region already
// smaller than this is left alone, never upscaled.
const MAX_OUTPUT_SIZE = 512;

export async function getCroppedImageFile(imageSrc: string, crop: CropPixels, filename = 'avatar.jpg'): Promise<File> {
  const image = await loadImage(imageSrc);
  const outputSize = Math.min(crop.width, crop.height, MAX_OUTPUT_SIZE);

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported');

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to crop image'))), 'image/jpeg', 0.9);
  });

  return new File([blob], filename, { type: 'image/jpeg' });
}
