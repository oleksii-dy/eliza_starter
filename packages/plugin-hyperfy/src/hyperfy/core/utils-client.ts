/**
 * Local implementation of Hyperfy client utils
 * This replaces the import from '../hyperfy/src/core/utils-client.js'
 */

/**
 * Hashes a file using SHA-256
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Parses a URL and extracts components
 */
export function parseUrl(url: string): {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
} | null {
  try {
    const parsed = new URL(url);
    return {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash
    };
  } catch (error) {
    console.error('Invalid URL:', error);
    return null;
  }
}

/**
 * Converts a file to base64 data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Downloads a file from a URL
 */
export async function downloadFile(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Creates a File object from a URL
 */
export async function urlToFile(url: string, filename?: string): Promise<File> {
  const blob = await downloadFile(url);
  const name = filename || url.split('/').pop() || 'download';
  return new File([blob], name, { type: blob.type });
}

/**
 * Validates file size
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Gets file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Checks if file is a supported model format
 */
export function isSupportedModelFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['glb', 'gltf', 'vrm'].includes(ext);
}

/**
 * Checks if file is a supported image format
 */
export function isSupportedImageFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
} 