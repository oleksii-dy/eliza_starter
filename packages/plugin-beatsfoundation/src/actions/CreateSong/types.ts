import { Content } from "@elizaos/core";
import { CancelToken } from 'axios';

export interface CreateSongContent extends Content {
    prompt: string;
    lyrics?: string;
    genre?: string;
    mood?: string;
    isInstrumental?: boolean;
}

export interface CreateSongOptions {
    cancelToken?: CancelToken;
}
