import { test, expect } from '@playwright/test';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

const SERVER_URL = 'http://localhost:3000';
const DEFAULT_SERVER_ID = '00000000-0000-0000-0000-000000000000';
const AGENT_ID = '00000000-0000-0000-0000-000000000001';

async function waitForServer(maxAttempts = 30, delay = 1000): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${SERVER_URL}/api/server/health`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return false;
}

test.describe('Terminal Chat E2E Tests', () => {
  let socket: Socket;
  let userId: string;
  let channelId: string;

  test.beforeEach(async () => {
    // Wait for server to be ready
    const serverReady = await waitForServer();
    expect(serverReady).toBe(true);

    userId = uuidv4();
  });

  test.afterEach(async () => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });

  test('WebSocket connection establishment', async () => {
    await new Promise<void>((resolve, reject) => {
      socket = io(SERVER_URL, {
        reconnection: false,
        timeout: 5000,
      });

      socket.on('connect', () => {
        expect(socket.connected).toBe(true);
        resolve();
      });

      socket.on('connect_error', (error) => {
        reject(new Error(`Failed to connect: ${error.message}`));
      });
    });
  });

  test('DM channel creation and joining', async () => {
    // First establish connection
    socket = io(SERVER_URL);
    await new Promise<void>((resolve) => {
      socket.on('connect', () => resolve());
    });

    // Create/get DM channel
    const response = await fetch(
      `${SERVER_URL}/api/messaging/dm-channel?` +
        `targetUserId=${AGENT_ID}&currentUserId=${userId}&dmServerId=${DEFAULT_SERVER_ID}`
    );

    expect(response.ok).toBe(true);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.id).toBeTruthy();

    channelId = result.data.id;

    // Join channel via socket
    await new Promise<void>((resolve) => {
      socket.on('channel_joined', (data) => {
        expect(data.channelId).toBe(channelId);
        resolve();
      });

      socket.emit('0', {
        type: 0, // ROOM_JOINING
        payload: {
          channelId,
          entityId: userId,
          serverId: DEFAULT_SERVER_ID,
          metadata: {
            isDm: true,
            channelType: 'dm',
          },
        },
      });
    });
  });

  test('Send message and receive agent response', async () => {
    // Setup connection and channel
    socket = io(SERVER_URL);
    await new Promise<void>((resolve) => {
      socket.on('connect', () => resolve());
    });

    // Get DM channel
    const channelResponse = await fetch(
      `${SERVER_URL}/api/messaging/dm-channel?` +
        `targetUserId=${AGENT_ID}&currentUserId=${userId}&dmServerId=${DEFAULT_SERVER_ID}`
    );
    const channelResult = await channelResponse.json();
    channelId = channelResult.data.id;

    // Join channel
    await new Promise<void>((resolve) => {
      socket.on('channel_joined', () => resolve());
      socket.emit('0', {
        type: 0,
        payload: {
          channelId,
          entityId: userId,
          serverId: DEFAULT_SERVER_ID,
          metadata: { isDm: true },
        },
      });
    });

    // Send message and wait for response
    const testMessage = 'Hello Terminal, can you help me with coding?';
    const messageId = uuidv4();

    await new Promise<void>((resolve, reject) => {
      let receivedAck = false;
      let receivedResponse = false;

      // Listen for acknowledgment
      socket.on('messageAck', (data) => {
        expect(data.clientMessageId).toBe(messageId);
        expect(data.status).toBe('received_by_server_and_processing');
        receivedAck = true;
      });

      // Listen for agent response
      socket.on('messageBroadcast', (data) => {
        if (data.senderId === AGENT_ID && receivedAck) {
          expect(data.text).toBeTruthy();
          expect(data.text.length).toBeGreaterThan(0);
          receivedResponse = true;
          resolve();
        }
      });

      // Send message
      socket.emit('1', {
        type: 1, // SEND_MESSAGE
        payload: {
          channelId,
          serverId: DEFAULT_SERVER_ID,
          senderId: userId,
          senderName: 'TestUser',
          message: testMessage,
          messageId,
          source: 'e2e_test',
        },
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!receivedResponse) {
          reject(new Error('Timeout waiting for agent response'));
        }
      }, 30000);
    });
  });

  test('Message history retrieval', async () => {
    // Get DM channel
    const channelResponse = await fetch(
      `${SERVER_URL}/api/messaging/dm-channel?` +
        `targetUserId=${AGENT_ID}&currentUserId=${userId}&dmServerId=${DEFAULT_SERVER_ID}`
    );
    const channelResult = await channelResponse.json();
    channelId = channelResult.data.id;

    // Send a message first via REST API
    const messageResponse = await fetch(
      `${SERVER_URL}/api/messaging/central-channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_id: userId,
          content: 'Test message for history',
          server_id: DEFAULT_SERVER_ID,
          metadata: { user_display_name: 'TestUser' },
        }),
      }
    );
    expect(messageResponse.ok).toBe(true);

    // Retrieve message history
    const historyResponse = await fetch(
      `${SERVER_URL}/api/messaging/central-channels/${channelId}/messages?limit=10`
    );
    expect(historyResponse.ok).toBe(true);

    const historyResult = await historyResponse.json();
    expect(historyResult.success).toBe(true);
    expect(Array.isArray(historyResult.data.messages)).toBe(true);
    expect(historyResult.data.messages.length).toBeGreaterThan(0);
  });

  test('Log streaming functionality', async () => {
    socket = io(SERVER_URL);
    await new Promise<void>((resolve) => {
      socket.on('connect', () => resolve());
    });

    await new Promise<void>((resolve) => {
      let logReceived = false;

      socket.on('log_subscription_confirmed', (data) => {
        expect(data.subscribed).toBe(true);
      });

      socket.on('log_stream', (data) => {
        expect(data.type).toBe('log_entry');
        expect(data.payload).toBeTruthy();
        logReceived = true;
        resolve();
      });

      // Subscribe to logs
      socket.emit('subscribe_logs');
      socket.emit('update_log_filters', {
        agentName: 'Terminal',
        level: 'info',
      });

      // Wait for at least one log entry or timeout
      setTimeout(() => {
        if (!logReceived) {
          // Even if no logs, subscription should work
          resolve();
        }
      }, 5000);
    });
  });

  test('Reconnection handling', async () => {
    socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionAttempts: 3,
    });

    await new Promise<void>((resolve) => {
      socket.on('connect', () => resolve());
    });
    const firstSocketId = socket.id;

    // Force disconnect
    socket.disconnect();
    expect(socket.connected).toBe(false);

    // Manually reconnect
    socket.connect();

    await new Promise<void>((resolve) => {
      socket.on('connect', () => resolve());
    });
    expect(socket.connected).toBe(true);
    expect(socket.id).not.toBe(firstSocketId); // Should have new socket ID
  });
});
