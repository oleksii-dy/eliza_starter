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
  original_task_name: z.string({ description: "The 'task_name' from the original TASK_REQUEST." }),
  original_request_message_id: z.string().uuid({ message: "Original TASK_REQUEST message ID must be a valid UUID."}).optional().describe("The message_id of the TASK_REQUEST this is a response to. Crucial for supervisor tracking."),
  status: z.enum(["SUCCESS", "FAILURE", "IN_PROGRESS"], { description: "Status of the task execution."}),
  result: z.any().optional().describe("The result of the task if status is SUCCESS. Can be any JSON-compatible type."),
  error_message: z.string().nullable().optional().describe("Error message if status is FAILURE."),
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

export const PROCESS_A2A_TASK_EVENT = 'process_a2a_task';

// --- Supervisor Task Tracking Schemas (Conceptual for PoC) ---
export const DELEGATED_SUB_TASKS_TABLE_NAME = 'delegated_sub_tasks';

export enum DelegatedSubTaskStatus {
  PENDING_DELEGATION = 'PENDING_DELEGATION', // Supervisor decided to delegate, A2A message not yet confirmed sent
  DELEGATION_SENT = 'DELEGATION_SENT',       // SEND_A2A_MESSAGE action completed successfully
  ACKNOWLEDGED = 'ACKNOWLEDGED',          // Received ACK from specialist (task queued by them)
  IN_PROGRESS = 'IN_PROGRESS',           // Specialist agent reported IN_PROGRESS (future A2A enhancement)
  SUCCESS = 'SUCCESS',                   // Specialist agent reported SUCCESS
  FAILURE = 'FAILURE',                   // Specialist agent reported FAILURE
  WAITING_FOR_DEPENDENCY = 'WAITING_FOR_DEPENDENCY', // Waiting for other tasks to complete
}

export const DelegatedSubTaskSchema = z.object({
  id: z.string().uuid({ message: "DB record ID must be a valid UUID." }), // Internal DB primary key for this tracking record
  projectConversationId: z.string().uuid({ message: "Project Conversation ID must be a valid UUID." }),
  a2aRequestMessageId: z.string().uuid({ message: "A2A Request Message ID (to specialist) must be a valid UUID." }).describe("The message_id of the A2A TASK_REQUEST sent to the specialist agent."),
  subTaskName: z.string(),
  assignedAgentId: z.string().uuid({ message: "Assigned Agent ID must be a valid UUID." }),
  status: z.nativeEnum(DelegatedSubTaskStatus),
  resultSummary: z.string().nullable().optional().describe("Stringified JSON or key details from task result, or pointer to full result."),
  lastErrorMessage: z.string().nullable().optional(),
  delegatedAt: z.string().datetime({ message: "Delegated timestamp must be valid ISO 8601." }),
  lastStatusUpdateAt: z.string().datetime({ message: "Last status update timestamp must be valid ISO 8601." }),
  // Optional: Store parameters sent to specialist for easier review/retry
  // parametersSent: z.string().nullable().optional().describe("JSON string of parameters sent to specialist."),
  // Optional: Store dependencies for this sub-task
  // dependencies: z.string().nullable().optional().describe("JSON string array of prerequisite subTaskNames."),
});

export type DelegatedSubTask = z.infer<typeof DelegatedSubTaskSchema>;
// For creating new records, some fields might be optional or auto-generated (like id, timestamps by DB)
export type NewDelegatedSubTask = Omit<DelegatedSubTask, 'id' | 'delegatedAt' | 'lastStatusUpdateAt'> & {
  id?: string; // Allow optional ID for manual setting if needed, else DB generates
  delegatedAt?: string;
  lastStatusUpdateAt?: string;
};
