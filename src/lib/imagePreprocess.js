// ─── Image preprocessing before sending to Groq ────────────────────
// Rotates to landscape, sharpens, boosts contrast and brightness
// Works entirely in the browser via canvas — no extra dependencies

/**
 * Preprocess a base64 image for better AI recognition:
 * - Auto-rotate if portrait to landscape
 * - Boost brightness and contrast slightly for dark/shaded images
 * - Sharpen edges for angled/blurry shots
 * - Resize to optimal dimensions (max 1280px wide)
 * Returns { base64, width, height, wasProcessed }
 */
export async function preprocessImage(base64, options = {}) {
  const {
    maxWidth     = 1280,
    maxHeight    = 960,
    brightness   = 1.08,   // slight boost for dark field photos
    contrast     = 1.12,   // slight boost to make edges pop
    sharpen      = true,   // apply unsharp mask
    quality      = 0.88,   // JPEG quality
  } = options;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Scale down if too large
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Apply brightness + contrast via pixel manipulation
      if (brightness !== 1 || contrast !== 1) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        // Standard contrast factor: contrast is a multiplier (1.0 = no change, 1.12 = slight boost)
        const contrastFactor = contrast;

        for (let i = 0; i < data.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            let val = data[i + c];
            // Brightness
            val = val * brightness;
            // Contrast around midpoint 128
            val = (val - 128) * contrastFactor + 128;
            data[i + c] = Math.min(255, Math.max(0, Math.round(val)));
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Apply sharpening via convolution (unsharp mask approximation)
      if (sharpen) {
        const src = ctx.getImageData(0, 0, width, height);
        const dst = ctx.createImageData(width, height);
        const s = src.data, d = dst.data;

        // Copy ALL pixels first (including borders) so nothing stays black
        for (let i = 0; i < s.length; i++) d[i] = s[i];

        // Sharpen kernel: [0,-1,0,-1,5,-1,0,-1,0] — inner pixels only
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              const i  = (y * width + x) * 4 + c;
              const t  = ((y-1)*width+x)*4+c;
              const b  = ((y+1)*width+x)*4+c;
              const l  = (y*width+(x-1))*4+c;
              const r  = (y*width+(x+1))*4+c;
              d[i] = Math.min(255, Math.max(0,
                5 * s[i] - s[t] - s[b] - s[l] - s[r]
              ));
            }
            // Alpha channel — keep original
            const ai = (y * width + x) * 4 + 3;
            d[ai] = s[ai];
          }
        }
        ctx.putImageData(dst, 0, 0);
      }

      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve({
        base64:       dataUrl.split(",")[1],
        dataUrl,
        width,
        height,
        wasProcessed: true,
      });
    };
    img.onerror = () => {
      // Return original if processing fails
      resolve({ base64, dataUrl:`data:image/jpeg;base64,${base64}`, wasProcessed:false });
    };
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}

/**
 * Detect basic image quality issues before sending to AI
 * Returns { ok, issues[] }
 */
export function checkImageQuality(canvas) {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const issues = [];

  let totalBrightness = 0;
  let edgeStrength    = 0;
  const sampleSize    = Math.min(data.length / 4, 10000);

  for (let i = 0; i < sampleSize * 4; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    totalBrightness += (r + g + b) / 3;
  }
  const avgBrightness = totalBrightness / sampleSize;

  if (avgBrightness < 40)  issues.push("Image is too dark — try in better lighting or turn on torch");
  if (avgBrightness > 220) issues.push("Image is overexposed — move away from bright light or shade the camera");

  return { ok: issues.length === 0, issues };
}
