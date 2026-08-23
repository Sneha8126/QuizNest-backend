import multer from 'multer';
import { env } from '../config/env';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

// Keep uploads in memory only long enough for the request. The controller persists
// the bytes in MongoDB, so production deployments do not depend on local disk.
const storage = multer.memoryStorage();

export const uploadDocument = multer({
  storage,
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Unsupported file type. Allowed: PDF, DOCX, TXT, PPTX'));
      return;
    }
    cb(null, true);
  },
}).single('document');
