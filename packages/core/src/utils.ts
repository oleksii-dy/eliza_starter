import { Media } from './types';

export function safeReplacer() {
  const seen = new WeakSet();
  return function (key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

/**
 * Formats an attachment for LLM prompt context, handling file references appropriately.
 *
 * This function is part of Eliza's optimized attachment handling system which:
 * 1. Replaces large base64 data with compact storage references.
 * 2. Preserves attachment metadata while avoiding token bloat.
 * 3. Properly formats attachments for inclusion in LLM prompts.
 *
 * Storage references (`storageRef`) will point to a location where the file data is stored,
 * managed by a dedicated storage service in the backend.
 *
 * @param attachment The media attachment to format
 * @param index Index for labeling in multi-attachment contexts
 * @returns Formatted text for LLM prompt that avoids including large base64 data
 */
export function formatAttachmentForLLM(attachment: Media, index: number): string {
  // Access metadata safely with type checking
  const metadata = attachment.metadata as any; // Cast to any for easier metadata access
  const storageRef = metadata?.storageRef;
  const size = metadata?.size; // Optional size info

  let fileInfo = '';
  if (storageRef) {
    fileInfo = `Stored Reference: ${storageRef}
`;
    if (size !== undefined) {
      fileInfo += `Size: ${size} bytes
`;
    }
  }

  return `[ATTACHMENT ${index + 1}]
Title: ${attachment.title || 'Unnamed file'}
Type: ${attachment.contentType || 'Unknown'}
${fileInfo}Content: ${attachment.text || 'No extractable content'}
[END ATTACHMENT ${index + 1}]`;
}
