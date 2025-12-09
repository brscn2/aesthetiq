import { memoryStorage } from 'multer';

// Allowed image MIME types for wardrobe item uploads
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

// Maximum file size: 10MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const uploadConfig = {
  storage: memoryStorage(), // Use memory storage to get file.buffer for Azure upload
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and HEIC images are allowed.`
        ),
        false
      );
    }
  },
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

