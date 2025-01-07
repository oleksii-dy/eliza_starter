import { ActionProvider } from "@magickml/core";
import { VoiceResponse } from 'twilio/lib/twiml/VoiceResponse';
import { WebSocket } from 'ws';
import { handleCallConnection } from '../services/callConnectionHandler';

export const callProvider: ActionProvider = {
  name: 'twilio-call',
  execute: async ({ agent, event }) => {
    // Handle both incoming call setup and WebSocket connection
    if (event.type === 'incoming-call') {
      const twiml = new VoiceResponse();
      twiml.connect().stream({
        url: `wss://${process.env.SERVER_DOMAIN}/${agent.id}/twillio/call/connection`,
      });
      return twiml.toString();
    } else if (event.type === 'websocket-connection') {
      // Handle WebSocket connection
      const ws = event.websocket as WebSocket;
      const userId = event.userId;
      const roomId = event.roomId;

      // TODO: grab the phone and save it to memory along with userId and roomId, so basicallt if there are instruction to check if a new user or not. 

      await handleCallConnection(ws, agent.runtime, userId, roomId);
    }
  }
};