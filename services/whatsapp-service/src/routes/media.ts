import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Request, Response, Router } from 'express';
import fs from 'fs/promises';
import { StatusCodes } from 'http-status-codes';
import multer from 'multer';
import path from 'path';
import { config } from '../config/env.js';
import { jwtMiddleware } from '../middlewares/auth.js';
import { publicRateLimiter } from '../middlewares/rateLimit.js';

const router = Router();

// S3 Client (only if USE_S3 is true)
let s3Client: S3Client | null = null;
if (config.USE_S3 && config.AWS_REGION) {
  s3Client = new S3Client({
    region: config.AWS_REGION,
    credentials: config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY ? {
      accessKeyId: config.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
    } : undefined,
  });
}

// Multer configuration for local file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Ensure upload directory exists
      await fs.mkdir(config.MEDIA_UPLOAD_PATH, { recursive: true });
      cb(null, config.MEDIA_UPLOAD_PATH);
    } catch (error) {
      cb(error as Error, '');
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common media types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/mpeg',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Create multer error for file type rejection
      const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'file');
      error.message = `File type ${file.mimetype} not allowed`;
      cb(error);
    }
  },
});

// POST /media/upload - Upload media file
router.post('/upload', publicRateLimiter as any, jwtMiddleware, (req: Request, res: Response, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      req.logger.warn({
        msg: 'Multer error during upload',
        error: err.message,
        code: err.code,
      });

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          ok: false,
          error: 'File too large (max 50MB)',
          correlation_id: req.correlationId,
        });
      } else if (err.message.includes('File type') && err.message.includes('not allowed')) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          ok: false,
          error: err.message,
          correlation_id: req.correlationId,
        });
      } else {
        return res.status(StatusCodes.BAD_REQUEST).json({
          ok: false,
          error: err.message,
          correlation_id: req.correlationId,
        });
      }
    } else if (err) {
      req.logger.error({
        msg: 'Unexpected error during upload',
        error: err.message,
      });
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        ok: false,
        error: 'Upload failed',
        correlation_id: req.correlationId,
      });
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    req.logger.info({
      msg: 'Media upload request',
      useS3: config.USE_S3,
      hasFile: !!req.file,
    });

    if (config.USE_S3) {
      // S3 Upload flow
      if (!s3Client || !config.AWS_S3_BUCKET) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          ok: false,
          error: 'S3 not properly configured',
          correlation_id: req.correlationId,
        });
      }

      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          ok: false,
          error: 'No file provided',
          correlation_id: req.correlationId,
        });
      }

      // Generate unique S3 key
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const ext = path.extname(req.file.originalname);
      const s3Key = `media/${timestamp}-${randomString}${ext}`;

      // Create pre-signed URL for upload
      const putCommand = new PutObjectCommand({
        Bucket: config.AWS_S3_BUCKET,
        Key: s3Key,
        ContentType: req.file.mimetype,
      });

      const uploadUrl = await getSignedUrl(s3Client, putCommand, { expiresIn: 3600 }); // 1 hour
      const publicUrl = `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${s3Key}`;

      req.logger.info({
        msg: 'S3 pre-signed URL generated',
        s3Key,
        bucket: config.AWS_S3_BUCKET,
      });

      // Clean up local temp file
      await fs.unlink(req.file.path);

      res.status(StatusCodes.OK).json({
        ok: true,
        uploadUrl,
        publicUrl,
        s3Key,
        correlationId: req.correlationId,
      });
    } else {
      // Local file upload flow
      if (!req.file) {
        return res.status(StatusCodes.BAD_REQUEST).json({
          ok: false,
          error: 'No file provided',
          correlation_id: req.correlationId,
        });
      }

      // Generate local URL (assuming service is accessible via HTTP)
      const filename = req.file.filename;
      const localUrl = `/media/${filename}`;

      req.logger.info({
        msg: 'File uploaded locally',
        filename,
        path: req.file.path,
        size: req.file.size,
      });

      res.status(StatusCodes.OK).json({
        ok: true,
        localUrl,
        filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        correlationId: req.correlationId,
      });
    }
  } catch (error) {
    req.logger.error({
      msg: 'Failed to upload media',
      error: error instanceof Error ? error.message : String(error),
    });

    // Clean up file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        req.logger.warn({
          msg: 'Failed to clean up uploaded file',
          path: req.file.path,
          error: unlinkError instanceof Error ? unlinkError.message : String(unlinkError),
        });
      }
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: 'Internal server error',
      correlation_id: req.correlationId,
    });
  }
});

// GET /media/:filename - Serve local media files (only when USE_S3=false)
router.get('/:filename', async (req: Request, res: Response) => {
  if (config.USE_S3) {
    return res.status(StatusCodes.NOT_FOUND).json({
      ok: false,
      error: 'Local media serving disabled when using S3',
      correlation_id: req.correlationId,
    });
  }

  try {
    const filename = req.params.filename;

    // Security check: prevent directory traversal attacks
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      req.logger.warn({
        msg: 'Directory traversal attempt detected',
        filename,
      });
      return res.status(StatusCodes.FORBIDDEN).json({
        ok: false,
        error: 'Access denied',
        correlation_id: req.correlationId,
      });
    }

    const filePath = path.join(config.MEDIA_UPLOAD_PATH, filename);

    // Additional security check: ensure file is within upload directory
    const resolvedPath = path.resolve(filePath);
    const uploadDir = path.resolve(config.MEDIA_UPLOAD_PATH);

    if (!resolvedPath.startsWith(uploadDir)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        ok: false,
        error: 'Access denied',
        correlation_id: req.correlationId,
      });
    }

    // Check if file exists
    await fs.access(filePath);

    req.logger.info({
      msg: 'Serving local media file',
      filename,
      path: filePath,
    });

    res.sendFile(resolvedPath);
  } catch (error) {
    req.logger.warn({
      msg: 'Media file not found',
      filename: req.params.filename,
      error: error instanceof Error ? error.message : String(error),
    });

    res.status(StatusCodes.NOT_FOUND).json({
      ok: false,
      error: 'File not found',
      correlation_id: req.correlationId,
    });
  }
});

export default router;
