import { BaseApiClient } from '../lib/BaseClient';
export class MediaService extends BaseApiClient {
  /**
   * Upload media for an agent
   */
  async uploadAgentMedia(agentId, params) {
    const formData = new FormData();
    formData.append('file', params.file, params.filename);
    if (params.contentType) {
      formData.append('contentType', params.contentType);
    }
    if (params.metadata) {
      formData.append('metadata', JSON.stringify(params.metadata));
    }
    return this.request('POST', `/api/media/${agentId}/upload-media`, {
      body: formData,
    });
  }
  /**
   * Upload files to a channel
   */
  async uploadChannelFiles(channelId, params) {
    const formData = new FormData();
    params.files.forEach((file, index) => {
      formData.append(`files[${index}]`, file);
    });
    if (params.messageId) {
      formData.append('messageId', params.messageId);
    }
    if (params.metadata) {
      formData.append('metadata', JSON.stringify(params.metadata));
    }
    return this.request('POST', `/api/media/central-channels/${channelId}/upload`, {
      body: formData,
    });
  }
}
