// src/lib/imageCompressor.ts
'use client';

export interface CompressedImageResult {
  base64: string;
  dataUrl: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Resizes and compresses an image file on the client using HTML5 Canvas
 * Dramatically speeds up upload times (5-15MB -> 200-350KB) and avoids 413 Payload Too Large
 */
export async function compressReceiptImage(
  file: File,
  maxDimension = 1200,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;

    // If file is not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selected file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into memory'));
      img.onload = () => {
        let { width, height } = img;

        // Calculate scaled dimensions keeping aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2d context'));
          return;
        }

        // Draw and compress to JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] || '';
        const compressedSize = Math.round((base64.length * 3) / 4);

        resolve({
          base64,
          dataUrl,
          mimeType: 'image/jpeg',
          originalSize,
          compressedSize,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
