import multer from 'multer';
import path from 'path';
import { v4 as uuid } from 'uuid';

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), 'uploads'),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const ALLOWED_DOCS = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const ALLOWED_IMAGES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_DOCS.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, Excel, PowerPoint, and text files are allowed'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadImage = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Accepts images + docs — used for chat message attachments
export const uploadFile = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGES.has(file.mimetype) || ALLOWED_DOCS.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});
