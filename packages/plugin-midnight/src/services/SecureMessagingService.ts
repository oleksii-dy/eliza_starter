import { Service, IAgentRuntime, logger, UUID, asUUID } from '@elizaos/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import pino from 'pino';
import {
  type SecureMessage,
  type ChatRoom,
  type ChatMessage,
  type MidnightActionResult,
  MidnightNetworkError,
} from '../types/index.js';
import { MidnightNetworkService } from './MidnightNetworkService.js';

/**
 * Service for secure messaging between agents using Midnight Network's zero-knowledge capabilities
 */
export class SecureMessagingService extends Service {
  static serviceType = 'secure-messaging';
  serviceType = 'secure-messaging';
  capabilityDescription = 'Secure messaging service using Midnight Network zero-knowledge proofs';

  private midnightService?: MidnightNetworkService;
  private logger: pino.Logger;

  // Reactive state management
  private chatRooms$ = new BehaviorSubject<ChatRoom[]>([]);
  private messages$ = new BehaviorSubject<ChatMessage[]>([]);
  private incomingMessages$ = new Subject<SecureMessage>();

  private messagingContracts = new Map<UUID, string>(); // roomId -> contractAddress
  private messageHistory = new Map<UUID, ChatMessage[]>(); // roomId -> messages

  constructor(runtime: IAgentRuntime) {
    super(runtime);
    this.logger = pino({ name: 'SecureMessagingService' });
  }

  static async start(runtime: IAgentRuntime): Promise<SecureMessagingService> {
    const service = new SecureMessagingService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Secure Messaging Service...');

      // Get midnight network service
      const midnightService = this.runtime.getService<MidnightNetworkService>('midnight-network');
      if (!midnightService) {
        throw new MidnightNetworkError(
          'Midnight Network Service not available',
          'SERVICE_NOT_FOUND'
        );
      }
      this.midnightService = midnightService;

      // Load existing chat rooms and messages
      await this.loadExistingState();

      // Start message monitoring
      this.startMessageMonitoring();

      logger.info('Secure Messaging Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Secure Messaging Service:', error);
      throw error;
    }
  }

  private async loadExistingState(): Promise<void> {
    try {
      // Load chat rooms from private state
      const rooms = (await this.midnightService?.getPrivateState('chat_rooms')) || [];
      this.chatRooms$.next(rooms);

      // Load message history
      const messageHistory = (await this.midnightService?.getPrivateState('message_history')) || {};
      for (const [roomId, messages] of Object.entries(messageHistory)) {
        this.messageHistory.set(roomId as UUID, messages as ChatMessage[]);
      }

      this.logger.info('Loaded existing messaging state', {
        roomCount: rooms.length,
        messageCount: Object.keys(messageHistory).length,
      });
    } catch (error) {
      this.logger.error('Failed to load existing messaging state:', error);
    }
  }

  private startMessageMonitoring(): Promise<void> {
    // Monitor for incoming messages from all messaging contracts
    this.chatRooms$.subscribe((rooms) => {
      rooms.forEach((room) => {
        this.subscribeToRoomMessages(room.id);
      });
    });

    return Promise.resolve();
  }

  private async subscribeToRoomMessages(roomId: UUID): Promise<void> {
    const contractAddress = this.messagingContracts.get(roomId);
    if (!contractAddress || !this.midnightService) {
      return;
    }

    try {
      // Subscribe to contract state changes
      this.midnightService.subscribeToContract(contractAddress).subscribe({
        next: (contractState) => {
          this.handleContractStateChange(roomId, contractState);
        },
        error: (error) => {
          this.logger.error('Message subscription error:', error);
        },
      });
    } catch (error) {
      this.logger.error('Failed to subscribe to room messages:', error);
    }
  }

  private async handleContractStateChange(roomId: UUID, _contractState: any): Promise<void> {
    // Parse new messages from contract state
    // This would decode ZK-protected messages
    this.logger.debug('Contract state changed for room', { roomId });
  }

  /**
   * Create a new secure chat room
   */
  async createChatRoom(
    name: string,
    participants: UUID[],
    isPrivate: boolean = true
  ): Promise<MidnightActionResult> {
    if (!this.midnightService) {
      throw new MidnightNetworkError('Midnight Network Service not available', 'SERVICE_NOT_FOUND');
    }

    try {
      this.logger.info('Creating chat room', { name, participants, isPrivate });

      // Deploy messaging contract for the room
      const deployment = await this.midnightService.deployContract(
        // Mock contract - would be actual messaging contract
        {} as any,
        [participants, isPrivate],
        'messaging'
      );

      const roomId = asUUID(`room_${Date.now()}`);
      const room: ChatRoom = {
        id: roomId,
        name,
        participants: [this.runtime.agentId, ...participants],
        isPrivate,
        contractAddress: deployment.address,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      // Store room mapping
      this.messagingContracts.set(roomId, deployment.address);

      // Update state
      const currentRooms = this.chatRooms$.value;
      this.chatRooms$.next([...currentRooms, room]);

      // Persist to private state
      await this.midnightService.setPrivateState('chat_rooms', this.chatRooms$.value);

      // Start monitoring this room
      await this.subscribeToRoomMessages(roomId);

      this.logger.info('Chat room created successfully', {
        roomId,
        contractAddress: deployment.address,
      });

      return {
        success: true,
        data: {
          contractAddress: deployment.address,
        },
        message: `Chat room "${name}" created successfully`,
      };
    } catch (error) {
      this.logger.error('Failed to create chat room:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to create chat room',
      };
    }
  }

  /**
   * Join an existing chat room
   */
  async joinChatRoom(contractAddress: string): Promise<MidnightActionResult> {
    if (!this.midnightService) {
      throw new MidnightNetworkError('Midnight Network Service not available', 'SERVICE_NOT_FOUND');
    }

    try {
      this.logger.info('Joining chat room', { contractAddress });

      // Subscribe to contract to get room info
      const _contractState = await this.midnightService
        .subscribeToContract(contractAddress)
        .pipe(take(1))
        .toPromise();

      // Extract room information from contract state
      const roomId = asUUID(`room_${contractAddress.slice(-8)}`);
      const room: ChatRoom = {
        id: roomId,
        name: `Room ${contractAddress.slice(-8)}`,
        participants: [this.runtime.agentId], // Would be extracted from contract
        isPrivate: true,
        contractAddress,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      // Store room mapping
      this.messagingContracts.set(roomId, contractAddress);

      // Update state
      const currentRooms = this.chatRooms$.value;
      if (!currentRooms.find((r) => r.contractAddress === contractAddress)) {
        this.chatRooms$.next([...currentRooms, room]);
        await this.midnightService.setPrivateState('chat_rooms', this.chatRooms$.value);
      }

      // Start monitoring this room
      await this.subscribeToRoomMessages(roomId);

      this.logger.info('Successfully joined chat room', { roomId, contractAddress });

      return {
        success: true,
        data: { contractAddress },
        message: 'Successfully joined chat room',
      };
    } catch (error) {
      this.logger.error('Failed to join chat room:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to join chat room',
      };
    }
  }

  /**
   * Send a secure message to another agent
   */
  async sendSecureMessage(
    toAgent: UUID,
    content: string,
    roomId?: UUID
  ): Promise<MidnightActionResult> {
    if (!this.midnightService) {
      throw new MidnightNetworkError('Midnight Network Service not available', 'SERVICE_NOT_FOUND');
    }

    try {
      this.logger.info('Sending secure message', {
        toAgent,
        roomId,
        contentLength: content.length,
      });

      // Generate ZK proof for message authenticity using real circuit
      const { proofGenerator } = await import('../utils/proofGenerator.js');

      // Generate encryption key and nonce for this message
      const encryptionKey = new Uint8Array(32);
      const nonce = new Uint8Array(32);
      crypto.getRandomValues(encryptionKey);
      crypto.getRandomValues(nonce);

      const messageProof = await proofGenerator.generateMessageProof(
        this.runtime.agentId,
        toAgent,
        content,
        encryptionKey,
        nonce
      );

      const messageId = asUUID(`msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

      const message: ChatMessage = {
        id: messageId,
        roomId: roomId || asUUID('direct'),
        fromAgent: this.runtime.agentId,
        content,
        timestamp: new Date(),
        proof: messageProof,
        messageType: 'text',
      };

      // If this is a room message, use the room's contract
      if (roomId) {
        const contractAddress = this.messagingContracts.get(roomId);
        if (contractAddress) {
          // Submit message to room contract
          // This would call a contract method to store the encrypted message
          this.logger.debug('Submitting message to room contract', { contractAddress });
        }
      }

      // Store message locally
      const roomMessages = this.messageHistory.get(roomId || asUUID('direct')) || [];
      roomMessages.push(message);
      this.messageHistory.set(roomId || asUUID('direct'), roomMessages);

      // Update observable
      const allMessages = Array.from(this.messageHistory.values()).flat();
      this.messages$.next(allMessages);

      // Persist message history
      await this.midnightService.setPrivateState(
        'message_history',
        Object.fromEntries(this.messageHistory)
      );

      // Create secure message for recipient
      const secureMessage: SecureMessage = {
        id: messageId,
        fromAgent: this.runtime.agentId,
        toAgent,
        content,
        timestamp: new Date(),
        proof: messageProof,
        encrypted: true,
      };

      // Emit to subscribers
      this.incomingMessages$.next(secureMessage);

      this.logger.info('Secure message sent successfully', { messageId, toAgent });

      return {
        success: true,
        data: {
          messageId,
          proof: messageProof,
        },
        message: 'Message sent successfully',
      };
    } catch (error) {
      this.logger.error('Failed to send secure message:', error);
      return {
        success: false,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        message: 'Failed to send message',
      };
    }
  }

  /**
   * Get chat rooms for the current agent
   */
  getChatRooms(): Observable<ChatRoom[]> {
    return this.chatRooms$.asObservable();
  }

  /**
   * Get messages for a specific room
   */
  getRoomMessages(roomId: UUID): Observable<ChatMessage[]> {
    return this.messages$.pipe(
      map((messages) => messages.filter((msg) => msg.roomId === roomId)),
      shareReplay(1)
    );
  }

  /**
   * Get all messages
   */
  getAllMessages(): Observable<ChatMessage[]> {
    return this.messages$.asObservable();
  }

  /**
   * Subscribe to incoming messages
   */
  getIncomingMessages(): Observable<SecureMessage> {
    return this.incomingMessages$.asObservable();
  }

  /**
   * Get recent messages (for provider)
   */
  getRecentMessages(limit: number = 10): ChatMessage[] {
    const allMessages = Array.from(this.messageHistory.values()).flat();
    return allMessages
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Verify a message proof
   */
  async verifyMessageProof(message: SecureMessage): Promise<boolean> {
    if (!this.midnightService) {
      return false;
    }

    try {
      return await this.midnightService.verifyProof(message.proof);
    } catch (error) {
      this.logger.error('Failed to verify message proof:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    this.logger.info('Stopping Secure Messaging Service...');

    // Complete observables
    this.incomingMessages$.complete();

    this.logger.info('Secure Messaging Service stopped');
  }
}

// Helper function for take operator
function take<T>(count: number) {
  return (source: Observable<T>) =>
    new Observable<T>((subscriber) => {
      let taken = 0;
      const subscription = source.subscribe({
        next: (value) => {
          if (taken < count) {
            subscriber.next(value);
            taken++;
            if (taken === count) {
              subscriber.complete();
            }
          }
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      return () => subscription.unsubscribe();
    });
}
