import { USER_NAME } from '@/constants';
import { SOCKET_MESSAGE_TYPE } from '@elizaos/core';
import { Evt } from 'evt';
import { io, type Socket } from 'socket.io-client';
import { WorldManager } from './world-manager';
import { randomUUID, processFilesToMedia } from './utils';
import clientLogger from './logger';

// Define types for the events
export type MessageBroadcastData = {
  senderId: string;
  senderName: string;
  text: string;
  roomId: string;
  createdAt: number;
  source: string;
  name: string; // Required for ContentWithUser compatibility
  [key: string]: any;
};

export type MessageCompleteData = {
  roomId: string;
  [key: string]: any;
};

// Define type for control messages
export type ControlMessageData = {
  action: 'enable_input' | 'disable_input';
  target?: string;
  roomId: string;
  [key: string]: any;
};

// Socket.io manager options with correct types
type SocketManagerOptions = {
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  // These are non-standard but used by socket.io
  pingTimeout?: number;
  pingInterval?: number;
  transports?: string[];
  autoConnect?: boolean;
  reconnection?: boolean;
};

// A simple class that provides EventEmitter-like interface using Evt internally
class EventAdapter {
  private events: Record<string, Evt<any>> = {};

  constructor() {
    // Initialize common events
    this.events.messageBroadcast = Evt.create<MessageBroadcastData>();
    this.events.messageComplete = Evt.create<MessageCompleteData>();
    this.events.controlMessage = Evt.create<ControlMessageData>();
  }

  on(eventName: string, listener: (...args: any[]) => void) {
    if (!this.events[eventName]) {
      this.events[eventName] = Evt.create();
    }

    this.events[eventName].attach(listener);
    return this;
  }

  off(eventName: string, listener: (...args: any[]) => void) {
    if (this.events[eventName]) {
      const handlers = this.events[eventName].getHandlers();
      for (const handler of handlers) {
        if (handler.callback === listener) {
          handler.detach();
        }
      }
    }
    return this;
  }

  emit(eventName: string, ...args: any[]) {
    if (this.events[eventName]) {
      this.events[eventName].post(args.length === 1 ? args[0] : args);
    }
    return this;
  }

  once(eventName: string, listener: (...args: any[]) => void) {
    if (!this.events[eventName]) {
      this.events[eventName] = Evt.create();
    }

    this.events[eventName].attachOnce(listener);
    return this;
  }

  // For checking if EventEmitter has listeners
  listenerCount(eventName: string): number {
    if (!this.events[eventName]) return 0;
    return this.events[eventName].getHandlers().length;
  }

  // Used only for internal access to the Evt instances
  _getEvt(eventName: string): Evt<any> | undefined {
    return this.events[eventName];
  }
}

/**
 * SocketIOManager handles real-time communication between the client and server
 * using Socket.io. It maintains a single connection to the server and allows
 * joining and messaging in multiple rooms.
 */
class SocketIOManager extends EventAdapter {
  private static instance: SocketIOManager | null = null;
  private socket: Socket | null = null;
  private _isConnected = false;
  private connectPromise: Promise<void> | null = null;
  private resolveConnect: (() => void) | null = null;
  private activeRooms: Set<string> = new Set();
  private entityId: string | null = null;
  private agentIds: string[] | null = null;
  private initializeInProgress = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  // Public accessor for EVT instances (for advanced usage)
  public get evtMessageBroadcast() {
    return this._getEvt('messageBroadcast') as Evt<MessageBroadcastData>;
  }

  public get evtMessageComplete() {
    return this._getEvt('messageComplete') as Evt<MessageCompleteData>;
  }

  public get evtControlMessage() {
    return this._getEvt('controlMessage') as Evt<ControlMessageData>;
  }

  public get isConnected(): boolean {
    return this._isConnected;
  }

  private constructor() {
    super();
  }

  public static getInstance(): SocketIOManager {
    if (!SocketIOManager.instance) {
      SocketIOManager.instance = new SocketIOManager();
    }
    return SocketIOManager.instance;
  }

  /**
   * Initialize the Socket.io connection to the server
   * @param entityId The client entity ID
   */
  public initialize(entityId: string, agentIds: string[]): void {
    // Prevent multiple simultaneous initialization attempts
    if (this.initializeInProgress) {
      clientLogger.info('[SocketIO] Initialization already in progress, skipping');
      return;
    }

    // If already connected and initialized with the same parameters, just log and return
    if (
      this.socket &&
      this._isConnected &&
      this.entityId === entityId &&
      JSON.stringify(this.agentIds) === JSON.stringify(agentIds)
    ) {
      clientLogger.info('[SocketIO] Already connected with same parameters');
      return;
    }

    this.entityId = entityId;
    this.agentIds = agentIds;

    if (this.socket) {
      // If socket exists but is disconnected, try to reconnect instead of creating a new one
      if (!this._isConnected) {
        clientLogger.info('[SocketIO] Socket exists but disconnected, attempting to reconnect');
        this.socket.connect();
        return;
      }

      clientLogger.warn('[SocketIO] Socket already initialized');
      return;
    }

    this.initializeInProgress = true;
    this.reconnectAttempts = 0;

    // Create a single socket connection
    const fullURL = window.location.origin + '/';
    clientLogger.info('[SocketIO] Connecting to', fullURL);

    // Socket.io options with better timeout and reconnection settings
    const options: SocketManagerOptions = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      // These are non-standard but supported by socket.io
      pingTimeout: 30000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'], // Allow fallback to polling if websocket fails
    };

    this.socket = io(fullURL, options as any);

    // Set up connection promise for async operations that depend on connection
    this.connectPromise = new Promise<void>((resolve) => {
      this.resolveConnect = resolve;
    });

    this.socket.on('connect', () => {
      clientLogger.info('[SocketIO] Connected to server');
      this._isConnected = true;
      this.initializeInProgress = false;
      this.reconnectAttempts = 0;

      if (this.resolveConnect) {
        this.resolveConnect();
        this.resolveConnect = null;
      }

      // Rejoin any active rooms after reconnection
      if (this.activeRooms.size > 0) {
        clientLogger.info('[SocketIO] Rejoining active rooms:', Array.from(this.activeRooms));
        this.activeRooms.forEach((roomId) => {
          this.joinRoom(roomId);
        });
      }
    });

    this.socket.on('messageBroadcast', (data) => {
      clientLogger.info(`[SocketIO] Message broadcast received:`, data);

      // Log the full data structure to understand formats
      clientLogger.debug('[SocketIO] Message broadcast data structure:', {
        keys: Object.keys(data),
        senderId: data.senderId,
        senderNameType: typeof data.senderName,
        textType: typeof data.text,
        textLength: data.text ? data.text.length : 0,
        hasThought: 'thought' in data,
        hasActions: 'actions' in data,
        additionalKeys: Object.keys(data).filter(
          (k) =>
            ![
              'senderId',
              'senderName',
              'text',
              'roomId',
              'createdAt',
              'source',
              'thought',
              'actions',
            ].includes(k)
        ),
        attachments: data.attachments
          ? {
              count: Array.isArray(data.attachments) ? data.attachments.length : 'not an array',
              type: typeof data.attachments,
            }
          : 'none',
      });

      // Check if this is a message for one of our active rooms
      if (this.activeRooms.has(data.roomId)) {
        clientLogger.info(`[SocketIO] Handling message for active room ${data.roomId}`);
        // Post the message to the event
        this.emit('messageBroadcast', {
          ...data,
          name: data.senderName, // Required for ContentWithUser compatibility
        });
      } else {
        clientLogger.warn(
          `[SocketIO] Received message for inactive room ${data.roomId}, active rooms:`,
          Array.from(this.activeRooms)
        );
      }
    });

    this.socket.on('messageComplete', (data) => {
      this.emit('messageComplete', data);
    });

    // Listen for control messages
    this.socket.on('controlMessage', (data) => {
      clientLogger.info(`[SocketIO] Control message received:`, data);

      // Check if this is for one of our active rooms
      if (this.activeRooms.has(data.roomId)) {
        clientLogger.info(`[SocketIO] Handling control message for active room ${data.roomId}`);

        // Emit the control message event
        this.emit('controlMessage', data);
      } else {
        clientLogger.warn(
          `[SocketIO] Received control message for inactive room ${data.roomId}, active rooms:`,
          Array.from(this.activeRooms)
        );
      }
    });

    this.socket.on('disconnect', (reason) => {
      clientLogger.info(`[SocketIO] Disconnected. Reason: ${reason}`);
      this._isConnected = false;

      // Reset connect promise for next connection
      this.connectPromise = new Promise<void>((resolve) => {
        this.resolveConnect = resolve;
      });

      // If the server disconnected us, try to reconnect
      if (reason === 'io server disconnect') {
        clientLogger.info('[SocketIO] Server disconnected, attempting to reconnect');
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      clientLogger.error('[SocketIO] Connection error:', error);
      this.reconnectAttempts++;

      // Schedule an automatic reconnection attempt
      setTimeout(() => {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          clientLogger.error(
            `[SocketIO] Failed to connect after ${this.maxReconnectAttempts} attempts`
          );
          this.emit('connect_failed', { reason: 'Max reconnection attempts exceeded' });
          return;
        }

        clientLogger.info(
          `[SocketIO] Attempting reconnection after error (attempt ${this.reconnectAttempts})...`
        );
        if (this.socket) {
          this.socket.connect();
        } else {
          // Re-initialize if socket is null
          this.initializeInProgress = false; // Reset flag to allow reinitialization
          this.initialize(this.entityId || '', this.agentIds || []);
        }
      }, 3000); // Wait 3 seconds before reconnecting
    });

    // Handle reconnect events
    this.socket.on('reconnect', (attemptNumber) => {
      clientLogger.info(`[SocketIO] Reconnected after ${attemptNumber} attempts`);
      this._isConnected = true;
      this.reconnectAttempts = 0;

      if (this.resolveConnect) {
        this.resolveConnect();
        this.resolveConnect = null;
      }

      // Rejoin all active rooms
      this.activeRooms.forEach((roomId) => {
        this.joinRoom(roomId);
      });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      clientLogger.info(`[SocketIO] Reconnection attempt #${attemptNumber}`);
    });

    this.socket.on('reconnect_error', (error: Error) => {
      clientLogger.error(`[SocketIO] Reconnection error: ${error.message}`, error);
    });

    this.socket.on('reconnect_failed', () => {
      clientLogger.error('[SocketIO] Failed to reconnect after all attempts');
      this.emit('connect_failed', { reason: 'Reconnection failed' });
    });
  }

  /**
   * Join a room to receive messages from it
   * @param roomId Room/Agent ID to join
   */
  public async joinRoom(roomId: string): Promise<void> {
    if (!this.socket) {
      clientLogger.error('[SocketIO] Cannot join room: socket not initialized');
      return;
    }

    // Wait for connection if needed
    if (!this._isConnected) {
      clientLogger.info(`[SocketIO] Not connected, waiting before joining room ${roomId}`);
      try {
        // Set a timeout for the connection to avoid hanging indefinitely
        const connectWithTimeout = Promise.race([
          this.connectPromise as Promise<void>,
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          ),
        ]);

        await connectWithTimeout;
        clientLogger.info(`[SocketIO] Connected, now joining room ${roomId}`);
      } catch (error) {
        clientLogger.error(
          `[SocketIO] Failed to connect before joining room: ${(error as Error).message}`
        );
        return;
      }
    }

    this.activeRooms.add(roomId);
    this.socket.emit('message', {
      type: SOCKET_MESSAGE_TYPE.ROOM_JOINING,
      payload: {
        roomId,
        entityId: this.entityId,
        agentIds: this.agentIds,
      },
    });

    clientLogger.info(`[SocketIO] Joined room ${roomId}`);
  }

  /**
   * Leave a room to stop receiving messages from it
   * @param roomId Room/Agent ID to leave
   */
  public leaveRoom(roomId: string): void {
    if (!this.socket || !this._isConnected) {
      clientLogger.warn(`[SocketIO] Cannot leave room ${roomId}: not connected`);
      return;
    }

    this.activeRooms.delete(roomId);
    clientLogger.info(`[SocketIO] Left room ${roomId}`);
  }

  /**
   * Sends a message to a specific room via Socket.io.
   * Includes processing for file attachments.
   *
   * @param message Message text to send
   * @param roomId Room/Agent ID to send the message to
   * @param source Source identifier (e.g., 'client_chat')
   * @param files Optional array of File objects to attach
   */
  public async sendMessage(
    message: string,
    roomId: string,
    source: string,
    files?: File[]
  ): Promise<void> {
    if (!this.socket) {
      clientLogger.error('[SocketIO] Cannot send message: socket not initialized');
      // Emit local message for UI update even if we can't send
      this.emitLocalMessageForUIUpdate(message, roomId, source, files ? [] : undefined);
      return;
    }

    const messageId = randomUUID();

    if (!this._isConnected) {
      clientLogger.warn('[SocketIO] Socket not connected, waiting...');

      try {
        // Set a timeout for the connection promise to avoid hanging indefinitely
        const connectTimeout = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 5000);
        });

        await Promise.race([this.connectPromise, connectTimeout]);
        clientLogger.info('[SocketIO] Socket connected, proceeding with send.');
      } catch (error) {
        clientLogger.error(`[SocketIO] Failed to connect: ${(error as Error).message}`);

        // Try to reconnect explicitly
        if (this.socket) {
          this.socket.connect();
        }

        // Emit message locally so the UI isn't blocked
        this.emitLocalMessageForUIUpdate(
          message,
          roomId,
          source,
          files ? [] : undefined,
          messageId
        );
        return;
      }
    }

    const worldId = WorldManager.getWorldId();

    clientLogger.info(`[SocketIO] Sending message to room ${roomId}`, {
      messageId,
      textLength: message?.length,
      fileCount: files?.length || 0,
    });

    // Process files to media attachments if present
    let attachments: any[] | undefined;
    if (files && files.length > 0) {
      try {
        attachments = await processFilesToMedia(files);
        clientLogger.info(
          `[SocketIO] Processed ${attachments.length} file attachments for message ${messageId}`
        );
      } catch (error) {
        clientLogger.error(`[SocketIO] Error processing files for message ${messageId}:`, error);
        // Continue without attachments, don't fail the whole message
        attachments = undefined;
      }
    }

    try {
      // Always emit locally first for immediate UI update, before potentially failing server send
      this.emitLocalMessageForUIUpdate(message, roomId, source, attachments, messageId);

      // Now attempt to send to server
      this.socket.emit('message', {
        type: SOCKET_MESSAGE_TYPE.SEND_MESSAGE,
        payload: {
          senderId: this.entityId,
          senderName: USER_NAME,
          message: message || '', // Send empty string if only attachments
          roomId,
          worldId,
          messageId,
          source,
          attachments, // Include processed attachments in payload
        },
      });

      clientLogger.info(`[SocketIO] Message sent to server successfully: ${messageId}`);
    } catch (error) {
      clientLogger.error(`[SocketIO] Error sending message: ${(error as Error).message}`, error);
      // We already emitted locally, so the user's message appears in UI
    }
  }

  // Helper method to emit a message locally for UI updates
  private emitLocalMessageForUIUpdate(
    message: string,
    roomId: string,
    source: string,
    attachments?: any[],
    messageId?: string
  ): void {
    const localMessageId = messageId || randomUUID();
    const timestamp = Date.now();

    clientLogger.info(`[SocketIO] Emitting local message update: ${localMessageId}`);

    this.emit('messageBroadcast', {
      senderId: this.entityId as string,
      senderName: USER_NAME,
      text: message || '',
      roomId,
      createdAt: timestamp,
      source,
      name: USER_NAME, // Required for ContentWithUser compatibility
      attachments, // Include attachments for local display too
      id: localMessageId, // Include the message ID for UI keying/tracking
      _localTimestamp: timestamp, // Add a special property to identify local messages
      _isLocalEcho: true, // Flag to identify this as a local echo
    });
  }

  /**
   * Disconnect from the server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this._isConnected = false;
      this.activeRooms.clear();
      clientLogger.info('[SocketIO] Disconnected from server');
    }
  }
}

export default SocketIOManager.getInstance();
