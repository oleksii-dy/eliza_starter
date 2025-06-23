import { MessagePayload, HandlerCallback } from "@elizaos/core";
import { messageReceivedHandler } from "./handlers/messageReceivedHandler";

export enum hyperfyEventType {
  MESSAGE_RECEIVED = 'HYPERFY_MESSAGE_RECEIVED',
  VOICE_MESSAGE_RECEIVED = 'HYPERFY_VOICE_MESSAGE_RECEIVED'
}

const defaultCallback: HandlerCallback = async () => [];

export const hyperfyEvents = {
  [hyperfyEventType.MESSAGE_RECEIVED]: [
    async (payload: MessagePayload) => {
      await messageReceivedHandler({
        runtime: payload.runtime,
        message: payload.message,
        callback: payload.callback || defaultCallback,
        onComplete: payload.onComplete,
      });
    },
  ],

  [hyperfyEventType.VOICE_MESSAGE_RECEIVED]: [
    async (payload: MessagePayload) => {
      await messageReceivedHandler({
        runtime: payload.runtime,
        message: payload.message,
        callback: payload.callback || defaultCallback,
        onComplete: payload.onComplete,
      });
    },
  ],

  CONTROL_MESSAGE: []
};