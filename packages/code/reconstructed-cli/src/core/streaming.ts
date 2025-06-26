// Streaming implementation from original Claude CLI

import { EventEmitter } from 'events';
import { ToolSchema } from './tool-definitions';

// Message types from the original
export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
  id?: string;
  timestamp?: number;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  id?: string;
  name?: string;
  input?: any;
  content?: string;
  is_error?: boolean;
}

// Stream events
export interface StreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  message?: Message;
  index?: number;
  content_block?: ContentBlock;
  delta?: {
    type?: string;
    text?: string;
    partial_json?: string;
    stop_reason?: string;
  };
  error?: {
    type: string;
    message: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
}

// Tool state tracking
export interface ToolState {
  toolUseId: string;
  toolName: string;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'error';
  input: any;
  output?: any;
  error?: string;
  timestamp: number;
}

export class StreamingClient extends EventEmitter {
  private messages: Message[] = [];
  private currentMessage: Message | null = null;
  private currentContentBlock: ContentBlock | null = null;
  private toolStates: Map<string, ToolState> = new Map();
  private streamController: AbortController | null = null;

  async streamMessage(params: {
    messages: Message[];
    model: string;
    max_tokens: number;
    temperature?: number;
    tools?: ToolSchema[];
    system?: string;
    stream?: boolean;
  }): Promise<void> {
    this.streamController = new AbortController();
    const { signal } = this.streamController;

    try {
      // In real implementation, this would call the actual API
      // For now, we'll simulate the streaming based on extracted patterns
      const response = await this.simulateAPICall(params);
      
      if (params.stream !== false) {
        await this.handleSSEStream(response, signal);
      } else {
        await this.handleNonStreamingResponse(response);
      }
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  private async handleSSEStream(response: any, signal: AbortSignal): Promise<void> {
    // SSE format from original:
    // event: message_start
    // data: {"type":"message_start","message":{"id":"msg_xxx","type":"message","role":"assistant","content":[]}}

    const events: StreamEvent[] = this.generateStreamEvents();

    for (const event of events) {
      if (signal.aborted) break;

      await this.processStreamEvent(event);
      
      // Simulate streaming delay
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  private async processStreamEvent(event: StreamEvent): Promise<void> {
    switch (event.type) {
      case 'message_start':
        this.currentMessage = event.message!;
        this.emit('message_start', event.message);
        break;

      case 'content_block_start':
        this.currentContentBlock = event.content_block!;
        
        if (event.content_block?.type === 'tool_use') {
          const toolState: ToolState = {
            toolUseId: event.content_block.id!,
            toolName: event.content_block.name!,
            status: 'pending',
            input: {},
            timestamp: Date.now()
          };
          this.toolStates.set(toolState.toolUseId, toolState);
          
          // Emit permission request
          this.emit('tool_permission_request', {
            toolName: toolState.toolName,
            toolUseId: toolState.toolUseId,
            input: toolState.input
          });
        }
        
        this.emit('content_block_start', event.content_block);
        break;

      case 'content_block_delta':
        if (this.currentContentBlock?.type === 'text' && event.delta?.text) {
          this.currentContentBlock.text = (this.currentContentBlock.text || '') + event.delta.text;
          this.emit('text_delta', event.delta.text);
        } else if (this.currentContentBlock?.type === 'tool_use' && event.delta?.partial_json) {
          // Accumulate tool input
          const toolState = this.toolStates.get(this.currentContentBlock.id!);
          if (toolState) {
            try {
              toolState.input = JSON.parse(event.delta.partial_json);
            } catch {
              // Partial JSON, keep accumulating
            }
          }
        }
        break;

      case 'content_block_stop':
        if (this.currentContentBlock?.type === 'tool_use') {
          const toolState = this.toolStates.get(this.currentContentBlock.id!);
          if (toolState && toolState.status === 'approved') {
            await this.executeTool(toolState);
          }
        }
        this.emit('content_block_stop', this.currentContentBlock);
        this.currentContentBlock = null;
        break;

      case 'message_stop':
        if (this.currentMessage) {
          this.messages.push(this.currentMessage);
        }
        this.emit('message_stop', event.usage);
        this.currentMessage = null;
        break;

      case 'error':
        this.emit('error', event.error);
        break;
    }
  }

  // Tool execution with permission handling
  async approveTool(toolUseId: string): Promise<void> {
    const toolState = this.toolStates.get(toolUseId);
    if (!toolState) throw new Error(`Tool ${toolUseId} not found`);
    
    toolState.status = 'approved';
    await this.executeTool(toolState);
  }

  async rejectTool(toolUseId: string): Promise<void> {
    const toolState = this.toolStates.get(toolUseId);
    if (!toolState) throw new Error(`Tool ${toolUseId} not found`);
    
    toolState.status = 'rejected';
    this.emit('tool_rejected', toolUseId);
  }

  private async executeTool(toolState: ToolState): Promise<void> {
    toolState.status = 'executing';
    this.emit('tool_executing', toolState.toolUseId);

    try {
      // Execute based on tool name
      const result = await this.executeToolByName(toolState.toolName, toolState.input);
      
      toolState.output = result;
      toolState.status = 'completed';
      
      // Add tool result to conversation
      const toolResult: Message = {
        role: 'user',
        content: [{
          type: 'tool_result',
          id: toolState.toolUseId,
          content: JSON.stringify(result)
        }]
      };
      
      this.messages.push(toolResult);
      this.emit('tool_completed', toolState.toolUseId, result);
      
    } catch (error: any) {
      toolState.error = error.message;
      toolState.status = 'error';
      this.emit('tool_error', toolState.toolUseId, error);
    }
  }

  protected async executeToolByName(toolName: string, input: any): Promise<any> {
    // This would be the actual tool execution
    // For now, return mock results
    switch (toolName) {
      case 'Bash':
        return { stdout: 'Command executed', stderr: '', exitCode: 0 };
      case 'Read':
        return { content: 'File contents here...' };
      case 'Write':
        return { success: true, path: input.path };
      case 'Edit':
        return { success: true, path: input.path, edits_applied: input.edits.length };
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  // Generate tool use ID like original: toolu_${timestamp}_${random}
  private generateToolUseId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 7);
    return `toolu_${timestamp}_${random}`;
  }

  // Simulate stream events for testing
  private generateStreamEvents(): StreamEvent[] {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const toolUseId = this.generateToolUseId();

    return [
      {
        type: 'message_start',
        message: {
          id: messageId,
          role: 'assistant',
          content: []
        }
      },
      {
        type: 'content_block_start',
        index: 0,
        content_block: {
          type: 'text',
          text: ''
        }
      },
      {
        type: 'content_block_delta',
        index: 0,
        delta: {
          type: 'text_delta',
          text: 'I\'ll help you with that. Let me check the file.\n\n'
        }
      },
      {
        type: 'content_block_stop',
        index: 0
      },
      {
        type: 'content_block_start',
        index: 1,
        content_block: {
          type: 'tool_use',
          id: toolUseId,
          name: 'Read',
          input: {}
        }
      },
      {
        type: 'content_block_delta',
        index: 1,
        delta: {
          type: 'input_json_delta',
          partial_json: '{"path": "test.txt"}'
        }
      },
      {
        type: 'content_block_stop',
        index: 1
      },
      {
        type: 'message_stop',
        usage: {
          input_tokens: 100,
          output_tokens: 50
        }
      }
    ];
  }

  private async simulateAPICall(params: any): Promise<any> {
    // This would be the actual API call
    return { ok: true };
  }

  private async handleNonStreamingResponse(response: any): Promise<void> {
    // Handle non-streaming response
    const message: Message = {
      role: 'assistant',
      content: 'Non-streaming response'
    };
    this.messages.push(message);
    this.emit('message_complete', message);
  }

  stop(): void {
    this.streamController?.abort();
  }

  getMessages(): Message[] {
    return this.messages;
  }

  getToolStates(): Map<string, ToolState> {
    return this.toolStates;
  }
} 