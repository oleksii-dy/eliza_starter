import { validateUuid, logger, getContentTypeFromMimeType } from '@elizaos/core';
import express from 'express';
import { sendError, sendSuccess } from '../shared/response-utils';
import { ALLOWED_MEDIA_MIME_TYPES, MAX_FILE_SIZE } from '../shared/constants';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import FormData from 'form-data';
import sharp from 'sharp';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MEDIA_MIME_TYPES.includes(file.mimetype as any)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Helper function to save uploaded file
async function saveUploadedFile(
  file: Express.Multer.File,
  agentId: string
): Promise<{ filename: string; url: string }> {
  const uploadDir = path.join(process.cwd(), '.eliza/data/uploads/agents', agentId);

  // Ensure directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname);
  const filename = `${timestamp}-${random}${ext}`;
  const filePath = path.join(uploadDir, filename);

  // Write file to disk
  fs.writeFileSync(filePath, file.buffer);

  const url = `/media/uploads/agents/${agentId}/${filename}`;
  return { filename, url };
}

/**
 * Agent media upload functionality
 */
export function createAgentMediaRouter(): express.Router {
  const router = express.Router();

  // Helper function to extract filename from Catbox URLs
  const extractFilenameFromCatboxUrl = (url: string): string | null => {
    try {
      // Handle various Catbox URL formats:
      // https://files.catbox.moe/abc123.jpg
      // https://catbox.moe/abc123.jpg
      // abc123.jpg (just the filename)
      const patterns = [
        /https?:\/\/files\.catbox\.moe\/([^\/\?]+)/,
        /https?:\/\/catbox\.moe\/([^\/\?]+)/,
        /^([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)$/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      // Fallback: try to extract from the end of any URL
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.includes('.')) {
        return lastPart.split('?')[0]; // Remove query parameters if any
      }

      return null;
    } catch (error) {
      logger.error('[FILENAME EXTRACT] Error extracting filename from URL:', error);
      return null;
    }
  };

  const cleanupFile = (filePath: string) => {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        logger.error(`Error cleaning up file ${filePath}:`, error);
      }
    }
  };

  // Media upload endpoint for images and videos using multer
  router.post('/:agentId/upload-media', upload.single('file'), async (req, res) => {
    logger.debug('[MEDIA UPLOAD] Processing media upload');
    const agentId = validateUuid(req.params.agentId);

    if (!agentId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_ID',
          message: 'Invalid agent ID format',
        },
      });
      return;
    }

    const mediaFile = req.file;
    if (!mediaFile) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'No media file provided',
        },
      });
      return;
    }

    // Check if it's a valid media file (image or video)
    const validImageTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
    ];
    const validVideoTypes = [
      'video/mp4',
      'video/webm',
      'video/mov',
      'video/avi',
      'video/mkv',
      'video/quicktime',
    ];
    const allValidTypes = [...validImageTypes, ...validVideoTypes];

    if (!allValidTypes.includes(mediaFile.mimetype)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: 'File must be an image or video',
        },
      });
      return;
    }

    try {
      const mediaType = getContentTypeFromMimeType(mediaFile.mimetype);
      const isImage = validImageTypes.includes(mediaFile.mimetype);

      if (isImage) {
        // Upload image to Catbox.moe with compression and timeout handling
        logger.debug('[MEDIA UPLOAD] Processing image for Catbox.moe upload');

        // Check file size
        const fileSizeInMB = mediaFile.size / (1024 * 1024);
        const MAX_SIZE_MB = 180; // Leave some buffer under 200MB limit
        const COMPRESSION_THRESHOLD_MB = 1; // Compress files larger than 1MB

        let processedBuffer = mediaFile.buffer;
        let shouldCompress = fileSizeInMB > COMPRESSION_THRESHOLD_MB;

        // Compress image if it's too large
        if (shouldCompress) {
          logger.debug(`[MEDIA UPLOAD] Image size: ${fileSizeInMB.toFixed(2)}MB, compressing...`);

          try {
            let quality = 85;
            let width: number | null = null;

            // Determine compression strategy based on file size
            if (fileSizeInMB > 50) {
              quality = 60;
              width = 1920; // Max width for very large images
            } else if (fileSizeInMB > 20) {
              quality = 70;
              width = 2560;
            } else if (fileSizeInMB > 10) {
              quality = 80;
            } else if (fileSizeInMB > 5) {
              quality = 85;
            } else {
              quality = 90; // Light compression for smaller files
            }

            let sharpInstance = sharp(mediaFile.buffer);

            if (width) {
              sharpInstance = sharpInstance.resize(width, null, {
                withoutEnlargement: true,
                fit: 'inside',
              });
            }

            // Convert to JPEG for better compression (except for PNG with transparency)
            if (mediaFile.mimetype === 'image/png') {
              // Check if PNG has transparency
              const metadata = await sharp(mediaFile.buffer).metadata();
              if (metadata.channels === 4 || metadata.hasAlpha) {
                // Keep as PNG but compress
                processedBuffer = await sharpInstance.png({ quality }).toBuffer();
              } else {
                // Convert to JPEG for better compression
                processedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
              }
            } else {
              // For JPEG and other formats
              processedBuffer = await sharpInstance.jpeg({ quality }).toBuffer();
            }

            // Check compressed file size
            const compressedSizeMB = processedBuffer.length / (1024 * 1024);

            logger.debug(
              `[MEDIA UPLOAD] Compressed from ${fileSizeInMB.toFixed(2)}MB to ${compressedSizeMB.toFixed(2)}MB`
            );

            if (compressedSizeMB >= MAX_SIZE_MB) {
              logger.warn(
                `[MEDIA UPLOAD] Even after compression, file is ${compressedSizeMB.toFixed(2)}MB, using fallback`
              );
              throw new Error('File too large even after compression');
            }
          } catch (compressionError) {
            logger.error('[MEDIA UPLOAD] Compression failed:', compressionError);
            // If compression fails and file is too large, use fallback
            if (fileSizeInMB > MAX_SIZE_MB) {
              throw new Error('File too large and compression failed');
            }
            // Otherwise, try uploading original file
          }
        }

        // Upload to Catbox.moe via Vercel proxy
        try {
          const form = new FormData();
          form.append('reqtype', 'fileupload');
          form.append('fileToUpload', processedBuffer, {
            filename: mediaFile.originalname,
            contentType: mediaFile.mimetype,
          });

          // Set timeout based on file size (minimum 30s, up to 3 minutes for large files)
          const currentFileSizeMB = processedBuffer.length / (1024 * 1024);
          const timeoutMs = Math.max(30000, Math.min(180000, currentFileSizeMB * 2000)); // 2 seconds per MB

          logger.debug(
            `[MEDIA UPLOAD] Uploading ${currentFileSizeMB.toFixed(2)}MB to Catbox with ${timeoutMs / 1000}s timeout`
          );

          // Vercel proxy URL for Catbox.moe upload
          const catboxApiUrl = 'https://vercel-api-psi.vercel.app/api/catbox';

          const requestConfig: any = {
            timeout: timeoutMs,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          };

          const response = await axios.post(
            `${catboxApiUrl}?timeout=${timeoutMs}`,
            form,
            requestConfig
          );

          const catboxUrl = response.data.trim();

          if (!catboxUrl) {
            throw new Error('Invalid response from Catbox Proxy API');
          }

          // Extract filename from catbox URL to create our proxy URL
          // This masks the direct catbox URL behind our API
          const filename = extractFilenameFromCatboxUrl(catboxUrl);
          if (!filename) {
            throw new Error('Could not extract filename from Catbox URL');
          }

          // Create proxy URL that routes through our bidirectional proxy
          // Users will access: /api/catbox/filename.ext instead of https://files.catbox.moe/filename.ext
          const proxyUrl = `${catboxApiUrl}/${filename}`;

          // Get file size before cleanup
          const finalFileSize = processedBuffer.length;

          logger.info(`[MEDIA UPLOAD] Serving via proxy URL: ${proxyUrl}`);

          res.json({
            success: true,
            data: {
              url: proxyUrl, // Return proxy URL instead of direct catbox URL
              type: 'image',
              filename: mediaFile.filename,
              originalName: mediaFile.originalname,
              size: finalFileSize,
              compressed: shouldCompress,
            },
          });
        } catch (uploadError: any) {
          logger.error('[MEDIA UPLOAD] Catbox upload failed:', uploadError.message);

          // Fallback to local storage
          logger.debug('[MEDIA UPLOAD] Falling back to local storage');
          const result = await saveUploadedFile(mediaFile, agentId);
          const fileUrl = `${req.protocol}://${req.get('host')}${result.url}`;

          logger.info(`[MEDIA UPLOAD] Using local storage fallback: ${result.filename}`);

          res.json({
            success: true,
            data: {
              url: fileUrl,
              type: 'image',
              filename: result.filename,
              originalName: mediaFile.originalname,
              size: mediaFile.size,
              fallback: true,
            },
          });
        }
      } else {
        // For non-image files (videos), use the existing local upload logic
        const result = await saveUploadedFile(mediaFile, agentId);
        const fileUrl = `${req.protocol}://${req.get('host')}${result.url}`;

        logger.info(`[MEDIA UPLOAD] Successfully uploaded ${mediaType}: ${result.filename}`);

        res.json({
          success: true,
          data: {
            url: fileUrl,
            type: mediaType,
            filename: result.filename,
            originalName: mediaFile.originalname,
            size: mediaFile.size,
          },
        });
      }
    } catch (error: any) {
      logger.error(`[MEDIA UPLOAD] Error processing upload: ${error.message}`);

      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to process media upload',
        },
      });
    }
  });

  return router;
}
