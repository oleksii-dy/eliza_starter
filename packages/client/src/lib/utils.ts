import { AVATAR_IMAGE_MAX_SIZE } from '@/constants';
import type { UUID } from '@elizaos/core';
import { type ClassValue, clsx } from 'clsx';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names into a single string.
 * * @param {...ClassValue} inputs - Array of class names to be combined.
 * @returns { string } - Combined class names as a single string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

dayjs.extend(localizedFormat);

export const moment = dayjs;

export const formatAgentName = (name: string) => {
  return name.substring(0, 2);
};

/**
 * Converts a character name to a URL-friendly format by replacing spaces with hyphens
 */
/**
 * Converts a character name to a URL-friendly format by replacing spaces with hyphens.
 *
 * @param {string} name - The name of the character to convert.
 * @returns {string} The URL-friendly version of the character name.
 */
export function characterNameToUrl(name: string): string {
  return name.replace(/\s+/g, '-');
}

/**
 * Converts a URL-friendly character name back to its original format by replacing hyphens with spaces
 */
export function urlToCharacterName(urlName: string): string {
  return urlName.replace(/-+/g, ' ');
}

// crypto.randomUUID only works in https context in firefox
export function randomUUID(): UUID {
  return URL.createObjectURL(new Blob()).split('/').pop() as UUID;
}

export function getEntityId(): UUID {
  const USER_ID_KEY = 'elizaos-client-user-id';
  const existingUserId = localStorage.getItem(USER_ID_KEY);

  if (existingUserId) {
    return existingUserId as UUID;
  }

  const newUserId = randomUUID() as UUID;
  localStorage.setItem(USER_ID_KEY, newUserId);

  return newUserId;
}

export const compressImage = (
  file: File,
  maxSize = AVATAR_IMAGE_MAX_SIZE,
  quality = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const img = new Image();
        img.src = e.target.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const resizedBase64 = canvas.toDataURL('image/jpeg', quality);

          resolve(resizedBase64);
        };
        img.onerror = reject;
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a File to a base64 string
 * @param file The file to convert
 * @returns Promise resolving to a base64 string representation of the file
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        resolve(reader.result.toString());
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Processes an array of Files to create Media attachments suitable for sending.
 * Currently uses base64 data URLs.
 * @param files Array of files to process
 * @returns Promise resolving to an array of Media-like objects
 */
export const processFilesToMedia = async (files: File[]): Promise<any[]> => {
  const mediaAttachments = [];

  for (const file of files) {
    try {
      // Optionally compress images before converting to base64
      let base64Data: string;
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
        // Example: Compress images > 1MB
        console.log(`Compressing image: ${file.name}`);
        try {
          base64Data = await compressImage(file, 1024); // Compress to max 1024px
        } catch (compError) {
          console.error(`Failed to compress image ${file.name}, using original.`, compError);
          base64Data = await fileToBase64(file);
        }
      } else {
        base64Data = await fileToBase64(file);
      }

      mediaAttachments.push({
        // Note: Using client-side randomUUID for the initial object.
        // The backend processAttachments should ideally generate/use its own stable IDs if needed before storage.
        id: randomUUID(),
        url: base64Data, // The base64 data URL
        title: file.name,
        source: 'user_upload',
        contentType: file.type,
        description: `File uploaded by user: ${file.name}`,
        text: '', // Backend will extract text if applicable (e.g., from text files)
        metadata: {
          // Add original size maybe?
          originalSize: file.size,
        },
      });
    } catch (error) {
      console.error('Failed to process file:', file.name, error);
      // Optionally add an error marker or skip the file
    }
  }

  return mediaAttachments;
};
