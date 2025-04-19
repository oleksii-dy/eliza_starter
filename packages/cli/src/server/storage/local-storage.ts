import * as fs from 'fs/promises';
import * as path from 'path';
import crypto from 'crypto';
import { logger } from '@elizaos/core';

const STORAGE_DIR = path.join(process.cwd(), 'attachment_storage'); // Consider making this configurable

/**
 * Ensures the storage directory exists.
 */
async function ensureStorageDir(): Promise<void> {
  try {
    await fs.access(STORAGE_DIR);
  } catch (error) {
    logger.info(`Storage directory not found. Creating: ${STORAGE_DIR}`);
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

/**
 * Saves file data (from a base64 data URL) to local storage.
 *
 * @param dataUrl The base64 data URL (e.g., data:image/png;base64,...)
 * @param suggestedFilename Optional suggested filename to derive the extension
 * @returns The unique reference (filename) used to store the file.
 * @throws Error if the data URL is invalid or saving fails.
 */
export async function saveFile(dataUrl: string, suggestedFilename?: string): Promise<string> {
  await ensureStorageDir();

  const matches = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid data URL format');
  }

  const contentType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Generate a unique filename to avoid collisions
  const uniqueId = crypto.randomUUID();

  // Try to get a reasonable extension
  let extension = '.bin'; // Default extension
  const mimeTypeParts = contentType.split('/');
  if (mimeTypeParts.length === 2) {
    extension = `.${mimeTypeParts[1].split('+')[0]}`; // e.g. png, jpeg, pdf
  } else if (suggestedFilename) {
    const suggestedExt = path.extname(suggestedFilename);
    if (suggestedExt) {
      extension = suggestedExt;
    }
  }

  const filename = `${uniqueId}${extension}`;
  const filePath = path.join(STORAGE_DIR, filename);

  try {
    await fs.writeFile(filePath, buffer);
    logger.debug(`Saved attachment to local storage: ${filename}`, {
      filePath,
      size: buffer.length,
      contentType,
    });
    return filename; // Return the filename as the storage reference
  } catch (error) {
    logger.error(`Failed to save file to local storage: ${filename}`, { error });
    throw new Error(`Failed to save file: ${error.message}`);
  }
}

/**
 * Retrieves file data from local storage as a base64 data URL.
 *
 * @param storageRef The unique reference (filename) of the file.
 * @param contentType The MIME type of the file.
 * @returns The file content as a base64 data URL.
 * @throws Error if the file is not found or reading fails.
 */
export async function getFileAsDataUrl(storageRef: string, contentType: string): Promise<string> {
  const filePath = path.join(STORAGE_DIR, storageRef);

  try {
    await fs.access(filePath); // Check if file exists
    const buffer = await fs.readFile(filePath);
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64Data}`;
    logger.debug(`Retrieved file from local storage: ${storageRef}`, {
      filePath,
      size: buffer.length,
    });
    return dataUrl;
  } catch (error) {
    logger.error(`Failed to retrieve file from local storage: ${storageRef}`, { error });
    // Check if the error is because the file doesn't exist
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${storageRef}`);
    }
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Deletes a file from local storage.
 *
 * @param storageRef The unique reference (filename) of the file.
 * @returns Promise resolving when deletion is attempted.
 */
export async function deleteFile(storageRef: string): Promise<void> {
  const filePath = path.join(STORAGE_DIR, storageRef);
  try {
    await fs.unlink(filePath);
    logger.debug(`Deleted file from local storage: ${storageRef}`, { filePath });
  } catch (error) {
    // Ignore if file doesn't exist, log other errors
    if (error.code !== 'ENOENT') {
      logger.error(`Failed to delete file from local storage: ${storageRef}`, { error });
    }
  }
}
