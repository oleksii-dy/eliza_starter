import type { IAgentRuntime, UUID, Media, Content, Memory } from '@elizaos/core';
import { createUniqueUuid, logger, ModelType, formatAttachmentForLLM } from '@elizaos/core';
import crypto from 'crypto';
import { saveFile, getFileAsDataUrl, deleteFile } from './storage/local-storage'; // Import storage functions

/**
 * Decodes a base64 data URL and extracts the content
 * @param url Base64 data URL (e.g., data:text/plain;base64,SGVsbG8gV29ybGQ=)
 * @returns Decoded content as a string, or null if invalid
 */
function decodeBase64DataUrl(url: string): { buffer: Buffer; contentType: string } | null {
  try {
    if (!url || typeof url !== 'string') return null;

    const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!dataUrlMatch) return null;

    const contentType = dataUrlMatch[1];
    const base64Data = dataUrlMatch[2];
    const buffer = Buffer.from(base64Data, 'base64');
    return { buffer, contentType };
  } catch (error) {
    logger.error('Error decoding base64 data URL:', error);
    return null;
  }
}

/**
 * Extracts metadata from a base64 data URL without decoding the full content
 * @param url Base64 data URL
 * @returns Object containing contentType and a small data sample, or null if invalid
 */
function extractBase64UrlMetadata(url: string): { contentType: string; dataLength: number } | null {
  try {
    if (!url || typeof url !== 'string') return null;

    const dataUrlMatch = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!dataUrlMatch) return null;

    const contentType = dataUrlMatch[1] || 'application/octet-stream';
    const dataLength = dataUrlMatch[2].length; // Length of base64 string is indicative of size

    return { contentType, dataLength };
  } catch (error) {
    logger.error('Error extracting base64 URL metadata:', error);
    return null;
  }
}

/**
 * Process attachments for agent communication, saving data to storage.
 * @param attachments Array of attachment objects (typically from client)
 * @param agentRuntime The agent runtime instance
 * @returns Processed attachments ready for agent consumption and storage
 */
export async function processAttachments(
  attachments: any[],
  agentRuntime: IAgentRuntime
): Promise<Media[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  logger.debug(`Processing ${attachments.length} attachments for storage.`);

  const processedAttachments: Media[] = [];

  for (const [index, attachment] of attachments.entries()) {
    const id =
      (attachment.id as string) ||
      createUniqueUuid(
        agentRuntime,
        attachment.url || attachment.data || crypto.randomUUID()
      ).toString();
    const name = attachment.name || attachment.title || `attachment-${index}`;
    const contentType = attachment.contentType || 'application/octet-stream';
    let url = attachment.url || null;
    let text = attachment.text || null; // Start with potentially provided text
    let description = attachment.description || `File uploaded by user: ${name}`;
    let title = attachment.title || name;
    let metadata: Record<string, any> = { ...(attachment.metadata || {}) }; // Initialize metadata
    let storageRef: string | null = null;
    let size: number | null = null;

    logger.debug(`Processing attachment [${index}] with ID: ${id}`, {
      contentType: contentType,
      hasUrl: !!url,
      urlType: url ? (url.startsWith('data:') ? 'data-url' : 'other-url') : 'none',
      urlLength: url?.length,
      attachmentFields: Object.keys(attachment),
    });

    // If URL is a data URL, save it to storage
    if (url && url.startsWith('data:')) {
      const urlMetadata = extractBase64UrlMetadata(url);
      if (urlMetadata) {
        size = urlMetadata.dataLength; // Rough size estimate from base64 length
        try {
          // Save the file using the storage service
          storageRef = await saveFile(url, name);
          metadata.storageRef = storageRef;
          metadata.size = size; // Store size in metadata
          metadata.originalFilename = name; // Store original filename

          // Replace the large data URL with a marker or keep it null
          // We *don't* want the large data URL in the message memory
          url = null;

          logger.debug(`Saved attachment data to storage for ID: ${id}`, {
            storageRef,
            contentType: urlMetadata.contentType,
            estimatedSize: size,
          });

          // If it's a text file, decode and store text content
          if (contentType.startsWith('text/') && !text) {
            const decoded = decodeBase64DataUrl(attachment.url); // Use original URL here
            if (decoded) {
              text = decoded.buffer.toString('utf-8');
              logger.debug(`Extracted text content from attachment ID: ${id}`, {
                textLength: text.length,
              });
            }
          }
          // If it's an image, generate description (optional, could be done later)
          else if (contentType.startsWith('image/') && !text) {
            try {
              // Note: Passing the *original* data URL to the model
              const imageResult = await agentRuntime.useModel(
                ModelType.IMAGE_DESCRIPTION,
                attachment.url
              );
              if (imageResult) {
                text = imageResult.description || text;
                description = imageResult.description || description;
                title = imageResult.title || title;
                logger.debug(`Generated image description for ID: ${id}`, {
                  title,
                  descriptionLength: description?.length,
                });
              }
            } catch (imgError) {
              logger.error(
                `Failed to process image description for ID: ${id}: ${imgError.message}`,
                { imgError }
              );
            }
          }
        } catch (saveError) {
          logger.error(`Failed to save attachment ID ${id} to storage: ${saveError.message}`, {
            saveError,
          });
          // Decide how to handle failure - maybe skip attachment or store with error marker?
          // For now, we'll skip adding it to the processed list if storage fails.
          continue;
        }
      } else {
        logger.warn(
          `Could not extract metadata from data URL for attachment ID: ${id}. Skipping storage.`
        );
        // If metadata extraction fails, maybe keep original URL? Or skip?
        url = attachment.url; // Keep original URL if metadata fails, but log warning
      }
    } else if (url) {
      logger.warn(`Attachment ID ${id} has a non-data URL. It will not be stored locally.`, {
        url,
      });
      // Handle non-data URLs if necessary (e.g., fetch and store?)
    }

    processedAttachments.push({
      id,
      url, // URL will be null if stored, or the original non-data URL
      title,
      source: attachment.source || 'user_upload',
      description,
      text,
      contentType,
      metadata, // Includes storageRef, size, originalFilename if saved
    } as Media);
  }

  logger.info(`Completed processing ${processedAttachments.length} attachments.`);
  return processedAttachments;
}

/**
 * Creates a UUID that is deterministic based on input but safe to use
 * @param input String to base the UUID on
 * @returns A UUID
 */
export function createSafeUuid(input: string): UUID {
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  const uuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  return uuid as UUID;
}

/**
 * Resolves file references in an array of attachments by retrieving data from storage.
 * This is crucial for sending attachments back to clients.
 * @param attachments Array of attachments to process
 * @param agentRuntime Runtime instance
 * @returns Array of attachments with storageRefs resolved to data URLs where applicable
 */
export async function resolveAttachmentReferences(
  attachments: Media[],
  agentRuntime: IAgentRuntime
): Promise<Media[]> {
  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return attachments;
  }

  logger.debug(`Resolving storage references in ${attachments.length} attachments.`);

  const resolvedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      const storageRef = attachment.metadata?.storageRef as string | undefined;
      const contentType = attachment.contentType;

      // If it has a storageRef and a contentType, try to resolve it
      if (storageRef && contentType) {
        logger.debug(`Attempting to resolve storage reference for attachment: ${attachment.id}`, {
          storageRef,
          contentType,
        });
        try {
          // Retrieve the file content as a data URL from storage
          const dataUrl = await getFileAsDataUrl(storageRef, contentType);

          logger.debug(`Successfully resolved storage reference for attachment: ${attachment.id}`, {
            resolvedUrlLength: dataUrl.length,
          });

          // Return a *new* attachment object with the resolved URL
          return {
            ...attachment,
            url: dataUrl, // Replace storageRef info with actual data URL
            metadata: {
              ...attachment.metadata,
              resolvedFromStorage: true, // Add a marker if needed
            },
          } as Media;
        } catch (resolveError) {
          logger.error(
            `Failed to resolve storage reference for attachment ${attachment.id}: ${resolveError.message}`,
            {
              storageRef,
              resolveError,
            }
          );
          // If resolution fails, return the attachment as-is (with storageRef, without data URL)
          // The client might need to handle this case (e.g., show placeholder/error)
          return {
            ...attachment,
            url: null, // Ensure URL is null if resolution failed
            metadata: {
              ...attachment.metadata,
              resolveError: resolveError.message,
            },
          };
        }
      } else if (attachment.url && attachment.url.startsWith('data:')) {
        logger.warn(
          `Attachment ${attachment.id} already has a data URL. This shouldn't happen if processed correctly.`,
          { urlLength: attachment.url.length }
        );
        // If for some reason it still has a data URL, pass it through
        return attachment;
      }

      // If no storageRef or resolution failed, return the attachment without a data URL
      // Ensure URL is null if it wasn't already a non-data URL
      return {
        ...attachment,
        url: attachment.url && !attachment.url.startsWith('data:') ? attachment.url : null,
      };
    })
  );

  // Log summary of resolution
  const successfullyResolved = resolvedAttachments.filter(
    (a) => a.metadata?.resolvedFromStorage
  ).length;
  const failedToResolve = resolvedAttachments.filter((a) => a.metadata?.resolveError).length;
  const hadNoRef = attachments.length - successfullyResolved - failedToResolve;

  logger.info(`Attachment reference resolution complete.`, {
    total: attachments.length,
    resolved: successfullyResolved,
    failed: failedToResolve,
    noRef: hadNoRef,
  });

  return resolvedAttachments.map((att) => {
    // Clean up temporary metadata flags before returning
    const { resolvedFromStorage, resolveError, ...metadata } = att.metadata || {};
    return { ...att, metadata: Object.keys(metadata).length > 0 ? metadata : undefined };
  });
}
