// Update the IAttachment interface
/**
 * Interface representing an attachment.
 * @interface
 * @property {string} url - The URL of the attachment.
 * @property {string} [contentType] - The content type of the attachment, optional.
 * @property {string} title - The title of the attachment.
 */
export interface IAttachment {
  url: string;
  contentType?: string; // Make contentType optional
  title: string;
  id: string; // Ensure ID is required and string
  source: string; // Make source required to match Media
  description: string; // Make description required
  text: string; // Make text required
}

// Add IMessage interface
export interface IMessage {
  id: string | number; // Allow string or number for IDs
  name: string;
  text?: string;
  thought?: string;
  actions?: string[];
  attachments?: IAttachment[];
  createdAt: number;
  isUser?: boolean; // Flag to indicate if the message is from the current user
  agentId?: string; // Optional agent ID if message is from an agent
}
