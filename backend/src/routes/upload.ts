import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware, { AuthRequest } from '@/middleware/auth';

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'chat');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB, per issue requirement

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 20);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

// Upload a chat attachment (image or file). Returns the metadata the
// chat message payload embeds: { url, type, name, size }.
router.post('/chat', authMiddleware, (req: AuthRequest, res: Response) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File exceeds the 10MB size limit' });
    }
    if (err) {
      return res.status(400).json({ error: err.message || 'Invalid file' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    res.json({
      success: true,
      data: {
        url: `/uploads/chat/${req.file.filename}`,
        type: req.file.mimetype,
        name: req.file.originalname,
        size: req.file.size,
      },
    });
  });
});

export default router;
