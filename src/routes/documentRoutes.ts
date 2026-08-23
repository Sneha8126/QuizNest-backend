import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { uploadDocument } from '../middleware/upload';
import { uploadDocumentHandler } from '../controllers/documentController';

const router = Router();

router.post('/upload', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  uploadDocument(req, res, (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return res.status(400).json({ error: message });
    }
    next();
  });
}, uploadDocumentHandler);

export default router;
