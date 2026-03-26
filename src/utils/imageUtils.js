/**
 * Image utilities - compression before upload
 */

const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 1200;
const DEFAULT_QUALITY = 0.8;
const DEFAULT_MAX_SIZE_MB = 5;

/**
 * Compress an image file using canvas
 * @param {File} file - Original image file
 * @param {object} options - { maxWidth, maxHeight, quality, maxSizeMB }
 * @returns {Promise<File>} Compressed file (or original if already small enough)
 */
export async function compressImage(file, options = {}) {
    const {
        maxWidth = DEFAULT_MAX_WIDTH,
        maxHeight = DEFAULT_MAX_HEIGHT,
        quality = DEFAULT_QUALITY,
        maxSizeMB = DEFAULT_MAX_SIZE_MB,
    } = options;

    // Skip non-image files
    if (!file.type.startsWith('image/')) return file;

    // Skip if already small enough
    if (file.size <= maxSizeMB * 1024 * 1024) return file;

    // Skip SVG (can't compress with canvas)
    if (file.type === 'image/svg+xml') return file;

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            let { width, height } = img;

            // Calculate new dimensions maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        resolve(file); // Fallback to original
                        return;
                    }
                    const compressed = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });
                    resolve(compressed);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(file); // Fallback to original
        };

        img.src = url;
    });
}
