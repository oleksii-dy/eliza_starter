import { z } from 'zod';

export const A2AProtocolVersion = "a2a/v0.1";

export enum A2AMessageType {
  TASK_REQUEST = "TASK_REQUEST",
  TASK_RESPONSE = "TASK_RESPONSE",
  INFO_SHARE = "INFO_SHARE",
  ACK = "ACK",
}

// Generic payload for flexibility, specific payloads can be defined and validated as needed
export const A2APayloadSchema = z.record(z.any());
export type A2APayload = z.infer<typeof A2APayloadSchema>;

export const A2AMessageSchema = z.object({
  protocol_version: z.literal(A2AProtocolVersion),
  message_id: z.string().uuid("Message ID must be a valid UUID."),
  timestamp: z.string().datetime("Timestamp must be a valid ISO 8601 datetime string."),
  sender_agent_id: z.string().uuid("Sender Agent ID must be a valid UUID."),
  receiver_agent_id: z.string().uuid("Receiver Agent ID must be a valid UUID."),
  conversation_id: z.string().uuid("Conversation ID must be a valid UUID.").optional(),
  message_type: z.nativeEnum(A2AMessageType),
  payload: A2APayloadSchema,
});

export type A2AMessage = z.infer<typeof A2AMessageSchema>;

// Specific payload schemas (examples, can be expanded)
export const TaskRequestPayloadSchema = z.object({
  task_name: z.string(),
  task_description: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  expected_response_format: z.string().optional(),
});
export type TaskRequestPayload = z.infer<typeof TaskRequestPayloadSchema>;

export const TaskResponsePayloadSchema = z.object({
  original_task_name: z.string(),
  status: z.enum(["SUCCESS", "FAILURE", "IN_PROGRESS"]),
  result: z.any().optional(), // Can be any type of result
  error_message: z.string().nullable().optional(),
});
export type TaskResponsePayload = z.infer<typeof TaskResponsePayloadSchema>;

export const InfoSharePayloadSchema = z.object({
  info_type: z.string(),
  details: z.record(z.any()),
});
export type InfoSharePayload = z.infer<typeof InfoSharePayloadSchema>;

// Example of how to use with a specific payload for validation before sending
export type A2ATaskRequestMessage = Omit<A2AMessage, 'payload' | 'message_type'> & {
  message_type: A2AMessageType.TASK_REQUEST;
  payload: TaskRequestPayload;
};

export type A2ATaskResponseMessage = Omit<A2AMessage, 'payload' | 'message_type'> & {
  message_type: A2AMessageType.TASK_RESPONSE;
  payload: TaskResponsePayload;
};

// --- In-Memory Message Bus Event Types ---
// This is a simplified representation for an in-memory bus.
// A more robust system might use a dedicated event library or external message queue.

export const A2A_INTERNAL_EVENT_TOPIC = 'a2a_message_internal';

export interface A2AInternalEvent {
  targetAgentId: string; // The agent ID this message is intended for
  message: A2AMessage;   // The actual A2A message
}
