import { UUID } from '@elizaos/core';
import { BaseApiClient } from '../lib/BaseClient';
import { MediaUploadParams, MediaUploadResponse, ChannelUploadParams, ChannelUploadResponse } from '../types/media';
export declare class MediaService extends BaseApiClient {
    /**
     * Upload media for an agent
     */
    uploadAgentMedia(agentId: UUID, params: MediaUploadParams): Promise<MediaUploadResponse>;
    /**
     * Upload files to a channel
     */
    uploadChannelFiles(channelId: UUID, params: ChannelUploadParams): Promise<ChannelUploadResponse>;
}
