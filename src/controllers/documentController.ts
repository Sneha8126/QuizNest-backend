import { Request, Response } from 'express';
import { ApiError } from '../middleware/errorHandler';
import { StoredDocument } from '../models/Document';

export async function uploadDocumentHandler(req: Request, res: Response) {
  if (!req.file?.buffer) {
    throw new ApiError(400, 'No document was uploaded. Attach it under the "document" field.');
  }

  const document = await StoredDocument.create({
    ownerId: req.user!.userId,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    sizeBytes: req.file.size,
    data: req.file.buffer,
  });

  res.status(201).json({
    documentId: String(document._id),
    originalName: document.originalName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
  });
}
