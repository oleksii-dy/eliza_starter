// server/api/abstract.ts
import type { Agent, Character, Content, IAgentRuntime, Memory, UUID } from '@elizaos/core';
import {
  ChannelType,
  ModelType,
  composePrompt,
  composePromptFromState,
  createUniqueUuid,
  logger,
  messageHandlerTemplate,
  validateUuid,
  MemoryType,
  encryptStringValue,
  getSalt,
  encryptObjectValues,
} from '@elizaos/core';
import express from 'express';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import type { AgentServer } from '..';
import { upload } from '../loader';
// Declare a Map to store agents
const agents: Map<UUID, IAgentRuntime> = new Map();

// export class MyRequest {
//   readonly params: { agentId: UUID };
//   readonly body: { text: string; roomId?: UUID; entityId?: UUID; userName?: string; name?: string };
//   //constructor(params: { agentId: UUID }, body: { text: string; roomId?: UUID; entityId?: UUID; userName?: string; name?: string }) {
//   //this.params = params;
//   //this.body = body;
//   //}
// }
// export class MyResponse {
//   //readonly status: (code: number) => MyResponse;
//   //readonly json: (data: any) => void;
//   //readonly send: (data: Buffer) => void;
//   constructor() {
//     //this.status = (code: number) => this;
//     //this.json = (data: any) => { };
//     //this.sendFile = (path: string) => { };
//     //this.pipe = (stream: Readable) => { };
//     //this.send = (data: Buffer) => { };
//     //this.setHeader = (key: string, value: string) => { };
//   }
//   //set(headers: { [key: string]: string }) { }
//   //readonly setHeader: (key: string, value: string) => void;
//   //	readonly sendFile: (path: string) => void;
//   //readonly pipe: (stream: Readable) => void;
//   //readonly statusCode: number;
// }
export async function conversation(
  runtime: IAgentRuntime,
  roomId,
  entityId,
  userName,
  text,
  worldid
) {
  //req: MyRequest, res: MyResponse) {
  // const agentId = validateUuid(req.params.agentId);
  // if (!agentId) {
  //   console.error('Invalid agent ID format', {
  //     success: false,
  //     error: {
  //       code: 'INVALID_ID',
  //       message: 'Invalid agent ID format',
  //     },
  //   });
  //   return;
  // }

  // const { text, roomId: rawRoomId, entityId: rawUserId } = req.body;
  // if (!text) {
  //   console.error('Text is required for conversation', {
  //     success: false,
  //     error: {
  //       code: 'INVALID_REQUEST',
  //       message: 'Text is required for conversation',
  //     },
  //   });

  //   return;
  // }

  // //const runtime = agents.get(agentId);

  // if (!runtime) {
  //   console.error('Agent not found no runtime', {
  //     success: false,
  //     error: {
  //       code: 'NOT_FOUND',
  //       message: 'Agent not found',
  //     },
  //   });
  //   return;
  // }

  //try {
  //const roomId = createUniqueUuid(runtime, rawRoomId ?? `default-room-${agentId}`);
  //const entityId = createUniqueUuid(runtime, rawUserId ?? 'Anon');

  logger.debug('[SPEECH CONVERSATION] Ensuring connection');
  await runtime.ensureConnection({
    entityId,
    roomId,
    worldId: worldid,
    userName: userName,
    name: userName,
    source: 'training',
    type: ChannelType.API,
  });

  const messageId = createUniqueUuid(runtime, Date.now().toString());
  const content: Content = {
    text,
    attachments: [],
    source: 'training',
    inReplyTo: undefined,
    channelType: ChannelType.API,
  };

  const userMessage = {
    content,
    entityId,
    roomId,
    agentId: runtime.agentId,
  };

  const memory: Memory = {
    id: messageId,
    agentId: runtime.agentId,
    entityId,
    roomId,
    content,
    createdAt: Date.now(),
  };

  logger.debug('[SPEECH CONVERSATION] Creating memory');
  await runtime.createMemory(memory, 'messages');

  logger.debug('[SPEECH CONVERSATION] Composing state');
  const state = await runtime.composeState(userMessage);

  logger.debug('[SPEECH CONVERSATION] Creating context');
  const prompt = composePrompt({
    state,
    template: messageHandlerTemplate,
  });

  logger.debug(
    '[SPEECH CONVERSATION] Using LLM for response messageHandlerTemplate',
    messageHandlerTemplate
  );
  logger.debug('prompt', prompt);
  logger.debug('[SPEECH CONVERSATION] Using LLM for response prompt', prompt);
  const response = await runtime.useModel(ModelType.TEXT_LARGE, {
    prompt: prompt,
    system: messageHandlerTemplate,
    // messages: [
    //   {
    //     role: 'system',
    //     content: messageHandlerTemplate,
    //   },
    //   {
    //     role: 'user',
    //     content: prompt,
    //   },
    // ],
  });

  if (!response) {
    console.error('no response from model', {
      success: false,
      error: {
        code: 'MODEL_ERROR',
        message: 'No response from model',
      },
    });

    return;
  }

  logger.debug('[SPEECH CONVERSATION] Creating response memory');

  const responseMessage = {
    ...userMessage,
    content: { text: response },
    roomId: roomId as UUID,
    agentId: runtime.agentId,
  };

  await runtime.createMemory(responseMessage, 'messages');
  await runtime.evaluate(memory, state);

  await runtime.processActions(memory, [responseMessage as Memory], state, async () => [memory]);

  //  logger.debug('[SPEECH CONVERSATION] Generating speech response');

  //  const speechResponse = await runtime.useModel(ModelType.TEXT_TO_SPEECH, text);

  // Convert to Buffer if not already a Buffer
  // const audioBuffer = Buffer.isBuffer(speechResponse)
  //   ? speechResponse
  //   : await new Promise<Buffer>((resolve, reject) => {
  //       if (!(speechResponse instanceof Readable)) {
  //         return reject(new Error('Unexpected response type from TEXT_TO_SPEECH model'));
  //       }

  //       const chunks: Buffer[] = [];
  //       speechResponse.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  //       speechResponse.on('end', () => resolve(Buffer.concat(chunks)));
  //       speechResponse.on('error', (err) => reject(err));
  //     });

  // logger.debug('[SPEECH CONVERSATION] Setting response headers');

  // res.set({
  // 	'Content-Type': 'audio/mpeg',
  // 	'Transfer-Encoding': 'chunked',
  // });

  //res.send(Buffer.from(audioBuffer));

  logger.success(
    `[SPEECH CONVERSATION] Successfully processed conversation for: ${runtime.character.name}`
  );
  // } catch (error) {
  //   logger.error('[SPEECH CONVERSATION] Error processing conversation:', error);
  //   console.log('error processing conversation', {
  //     success: false,
  //     error: {
  //       code: 'PROCESSING_ERROR',
  //       message: 'Error processing conversation',
  //       details: error.message,
  //     },
  //   });
  // }
}
