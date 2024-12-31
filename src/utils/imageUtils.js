export async function resizeImage(file, maxSize = 1024) {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          // Calculate new dimensions (max 1024px on longest side)
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          // Set canvas dimensions and draw resized image
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          resolve(base64);
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      reject(error);
    }
  });
}

export function cleanDescription(description) {
  description = description.trim();
  const prefixes = ['an image of ', 'a photo of ', 'this image shows ', 'the image shows '];
  for (const prefix of prefixes) {
    if (description.toLowerCase().startsWith(prefix)) {
      description = description.slice(prefix.length);
    }
  }
  return description.charAt(0).toUpperCase() + description.slice(1);
} 