import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { correlationMiddleware } from '../src/middlewares/correlation.js';
import mediaRoutes from '../src/routes/media.js';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://test-bucket.s3.us-east-1.amazonaws.com/test-upload-url'),
}));

describe('Media Routes', () => {
  let app: express.Application;
  const testUploadPath = '/tmp/test-uploads';

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(correlationMiddleware);
    app.use('/media', mediaRoutes);

    // Error handler for tests
    app.use((error: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({
        ok: false,
        error: error.message,
        correlation_id: req.correlationId,
      });
    });

    // Ensure test upload directory exists
    await fs.mkdir(testUploadPath, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test files
    try {
      const files = await fs.readdir(testUploadPath);
      await Promise.all(files.map(file => fs.unlink(path.join(testUploadPath, file))));
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('POST /media/upload (Local mode - USE_S3=false)', () => {
    it('should upload file locally successfully', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(app)
        .post('/media/upload')
        .attach('file', testImageBuffer, {
          filename: 'test-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body).toEqual({
        ok: true,
        localUrl: expect.stringMatching(/^\/media\/.+\.jpg$/),
        filename: expect.stringMatching(/test-image-.+\.jpg$/),
        size: testImageBuffer.length,
        mimetype: 'image/jpeg',
        correlationId: expect.any(String),
      });
    });

    it('should return 400 when no file provided', async () => {
      const response = await request(app)
        .post('/media/upload')
        .expect(400);

      expect(response.body).toEqual({
        ok: false,
        error: 'No file provided',
        correlation_id: expect.any(String),
      });
    });

    it('should reject unsupported file types', async () => {
      const testBuffer = Buffer.from('fake-executable');

      const response = await request(app)
        .post('/media/upload')
        .attach('file', testBuffer, {
          filename: 'malware.exe',
          contentType: 'application/octet-stream',
        })
        .expect(400);

      expect(response.body.error).toContain('File type application/octet-stream not allowed');
    });

    it('should accept various supported file types', async () => {
      const supportedTypes = [
        { buffer: Buffer.from('fake-image'), filename: 'image.png', contentType: 'image/png' },
        { buffer: Buffer.from('fake-pdf'), filename: 'document.pdf', contentType: 'application/pdf' },
        { buffer: Buffer.from('fake-audio'), filename: 'audio.mp3', contentType: 'audio/mpeg' },
      ];

      for (const { buffer, filename, contentType } of supportedTypes) {
        const response = await request(app)
          .post('/media/upload')
          .attach('file', buffer, { filename, contentType })
          .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body.mimetype).toBe(contentType);
      }
    });
  });

  describe('GET /media/:filename (Local mode)', () => {
    it('should serve uploaded file', async () => {
      // First upload a file
      const testImageBuffer = Buffer.from('fake-image-data');
      const uploadResponse = await request(app)
        .post('/media/upload')
        .attach('file', testImageBuffer, {
          filename: 'test-serve.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      // Extract filename from response
      const filename = uploadResponse.body.filename;

      // Then try to access it
      const response = await request(app)
        .get(`/media/${filename}`)
        .expect(200);

      expect(response.body).toEqual(testImageBuffer);
    });

    it('should return 404 for non-existent file', async () => {
      const response = await request(app)
        .get('/media/non-existent-file.jpg')
        .expect(404);

      expect(response.body).toEqual({
        ok: false,
        error: 'File not found',
        correlation_id: expect.any(String),
      });
    });

    it('should prevent directory traversal attacks', async () => {
      const response = await request(app)
        .get('/media/..%2F..%2F..%2Fetc%2Fpasswd')
        .expect(403);

      expect(response.body).toEqual({
        ok: false,
        error: 'Access denied',
        correlation_id: expect.any(String),
      });
    });
  });

  describe('Correlation headers', () => {
    it('should propagate correlation headers in upload response', async () => {
      const correlationId = 'test-correlation-789';
      const testImageBuffer = Buffer.from('fake-image-data');

      const response = await request(app)
        .post('/media/upload')
        .set('x-correlation-id', correlationId)
        .attach('file', testImageBuffer, {
          filename: 'correlation-test.jpg',
          contentType: 'image/jpeg',
        })
        .expect(200);

      expect(response.body.correlationId).toBe(correlationId);
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });

    it('should propagate correlation headers in file serve response', async () => {
      const correlationId = 'test-correlation-serve';

      const response = await request(app)
        .get('/media/non-existent.jpg')
        .set('x-correlation-id', correlationId)
        .expect(404);

      expect(response.body.correlation_id).toBe(correlationId);
      expect(response.headers['x-correlation-id']).toBe(correlationId);
    });
  });
});
