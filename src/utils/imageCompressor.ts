/**
 * Utility to compress and resize images on the client side using HTML5 Canvas.
 * Compresses images to maximum 800px width/height and under 300KB size.
 * This prevents high-resolution camera photos from causing Cloudinary timeouts or UI freezes.
 */

export async function compressImageFile(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  initialQuality = 0.8,
  maxSizeBytes = 300 * 1024 // 300 KB
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down dimensions to fit within maxWidth and maxHeight (default 800px)
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          // Fallback to original data URL if canvas context unavailable
          resolve(event.target?.result as string);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        let quality = initialQuality;
        let compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

        // Helper to calculate approximate byte size from data URL
        const calculateBytes = (dataUrl: string) => {
          const base64Content = dataUrl.split(",")[1] || "";
          return Math.round((base64Content.length * 3) / 4);
        };

        // Iteratively reduce JPEG compression quality if still above 300KB
        let attempts = 0;
        while (calculateBytes(compressedDataUrl) > maxSizeBytes && attempts < 5 && quality > 0.3) {
          quality -= 0.12;
          compressedDataUrl = canvas.toDataURL("image/jpeg", Math.max(quality, 0.3));
          attempts++;
        }

        // If still > 300KB, downscale canvas dimensions progressively
        if (calculateBytes(compressedDataUrl) > maxSizeBytes) {
          let scaleFactor = 0.75;
          while (calculateBytes(compressedDataUrl) > maxSizeBytes && scaleFactor >= 0.4) {
            const downCanvas = document.createElement("canvas");
            downCanvas.width = Math.round(width * scaleFactor);
            downCanvas.height = Math.round(height * scaleFactor);
            const downCtx = downCanvas.getContext("2d");
            if (downCtx) {
              downCtx.imageSmoothingEnabled = true;
              downCtx.imageSmoothingQuality = "high";
              downCtx.drawImage(canvas, 0, 0, downCanvas.width, downCanvas.height);
              compressedDataUrl = downCanvas.toDataURL("image/jpeg", Math.max(quality, 0.5));
            }
            scaleFactor -= 0.15;
          }
        }

        resolve(compressedDataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

/**
 * Compresses an existing base64 string if it exceeds dimensions or target size.
 */
export async function compressBase64(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
  maxSizeBytes = 300 * 1024
): Promise<string> {
  if (!base64Str || !base64Str.startsWith("data:image/")) return base64Str;
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      let q = quality;
      let res = canvas.toDataURL("image/jpeg", q);
      const getBytes = (str: string) => Math.round(((str.split(",")[1] || "").length * 3) / 4);

      let attempts = 0;
      while (getBytes(res) > maxSizeBytes && attempts < 5 && q > 0.3) {
        q -= 0.12;
        res = canvas.toDataURL("image/jpeg", Math.max(q, 0.3));
        attempts++;
      }

      resolve(res);
    };
    img.onerror = () => resolve(base64Str);
  });
}

