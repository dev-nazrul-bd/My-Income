/**
 * Crops an image to a slightly tall ratio (e.g., 1:1.2) and compresses it
 * iteratively until it is close to the target KB limit.
 */
export async function resizeAndCompressImage(
  file: File,
  targetKB: number,
  isSquare: boolean = false
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get 2d canvas context"));
          return;
        }

        let targetWidth = img.width;
        let targetHeight = img.height;

        if (isSquare) {
          // 1:1 square ratio for avatar
          const size = Math.min(img.width, img.height);
          canvas.width = 300;
          canvas.height = 300;
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 300, 300);
        } else {
          // "slightly longer than square" ratio for product image e.g. 1:1.2
          // Target 400px width by 480px height
          canvas.width = 400;
          canvas.height = 480;

          // Crop input image source to match 1:1.2 aspect ratio
          const inputAspect = img.width / img.height;
          const targetAspect = 1 / 1.2;

          let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

          if (inputAspect > targetAspect) {
            // Source is too wide
            sWidth = img.height * targetAspect;
            sx = (img.width - sWidth) / 2;
          } else {
            // Source is too tall
            sHeight = img.width / targetAspect;
            sy = (img.height - sHeight) / 2;
          }

          ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 400, 480);
        }

        // Iterative compression
        let quality = 0.9;
        const targetBytes = targetKB * 1024;
        
        const compress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Canvas export failed"));
                return;
              }
              // If size is under target or quality is too low, stop
              if (blob.size <= targetBytes || quality <= 0.1) {
                resolve(blob);
              } else {
                quality -= 0.1;
                compress();
              }
            },
            "image/jpeg",
            quality
          );
        };

        compress();
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a file/blob to Cloudinary.
 */
export async function uploadToCloudinary(blob: Blob): Promise<string> {
  const cloudName = "ddtf1d2yk";
  const uploadPreset = "Dev Nazrul";

  const formData = new FormData();
  formData.append("file", blob, "upload.jpg");
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudinary upload failed: ${errText}`);
  }

  const data = await response.json();
  return data.secure_url;
}
