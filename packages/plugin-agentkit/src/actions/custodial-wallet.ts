import {
  type Action,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  type UUID,
} from '@elizaos/core';
import type { CustodialWalletService } from '../services/CustodialWalletService';

/**
 * Create a new custodial wallet for an entity, room, or world
 */
export const createCustodialWalletAction: Action = {
  name: 'CREATE_CUSTODIAL_WALLET',
  similes: ['CREATE_WALLET', 'NEW_WALLET', 'SETUP_WALLET'],
  description:
    'Create a new custodial wallet for users, rooms, or worlds with trust-based access control',
  enabled: false, // Disabled by default - extremely dangerous, creates cryptocurrency wallets

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
    if (!custodialService) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    const keywords = [
      'create wallet',
      'new wallet',
      'setup wallet',
      'make wallet',
      'custodial wallet',
    ];
    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
      if (!custodialService) {
        throw new Error('Custodial wallet service not available');
      }

      // Extract parameters from message
      const text = message.content.text || '';
      const params = await extractWalletParams(text, message, state || ({} as State));

      // Create the wallet
      const wallet = await custodialService.createWallet({
        name: params.name || 'Custodial Wallet',
        description: params.description,
        entityId: params.entityId || message.entityId,
        roomId: params.roomId || message.roomId,
        worldId: params.worldId,
        ownerId: message.entityId,
        isPool: params.isPool || false,
        purpose: params.purpose || 'general',
        trustLevel: params.trustLevel || 30,
        maxBalance: params.maxBalance,
        allowedTokens: params.allowedTokens,
      });

      const response = `✅ Created custodial wallet successfully!

**Wallet Details:**
- 🆔 ID: ${wallet.id}
- 📍 Address: ${wallet.address}
- 🌐 Network: ${wallet.network}
- 👤 Owner: ${wallet.ownerId}
- 🎯 Purpose: ${wallet.metadata.purpose}
- 🔒 Trust Level Required: ${wallet.metadata.trustLevel}
${wallet.isPool ? '- 🏊 Pool Wallet: Yes' : ''}

The wallet is now ready for use. Users with sufficient trust levels can interact with it.`;

      callback?.({
        text: response,
        content: {
          success: true,
          walletId: wallet.id,
          address: wallet.address,
          purpose: wallet.metadata.purpose,
        },
      });

      return {
        success: true,
        data: wallet,
        metadata: {
          action: 'create_custodial_wallet',
          walletId: wallet.id,
          address: wallet.address,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback?.({
        text: `❌ Failed to create custodial wallet: ${errorMessage}`,
        content: { success: false, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage,
        metadata: { action: 'create_custodial_wallet' },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a custodial wallet for my DeFi activities',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a custodial wallet for your DeFi activities. This will be a secure wallet that I manage on your behalf.",
          thought:
            "User wants a custodial wallet for DeFi. I'll create one with appropriate trust levels and DeFi purpose.",
          actions: ['CREATE_CUSTODIAL_WALLET'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Setup a shared wallet pool for our team in this room',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll create a shared wallet pool for your team in this room. This will allow team members to contribute and use funds collaboratively.",
          thought:
            "User wants a pool wallet for the room. I'll create a custodial wallet associated with this room.",
          actions: ['CREATE_CUSTODIAL_WALLET'],
        },
      },
    ],
  ],
};

/**
 * List custodial wallets for current context
 */
export const listCustodialWalletsAction: Action = {
  name: 'LIST_CUSTODIAL_WALLETS',
  similes: ['SHOW_WALLETS', 'MY_WALLETS', 'VIEW_WALLETS'],
  description: 'List custodial wallets accessible to the user',
  enabled: false, // Disabled by default - can expose sensitive wallet information

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
    if (!custodialService) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    const keywords = ['list wallets', 'show wallets', 'my wallets', 'view wallets', 'wallet list'];
    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
      if (!custodialService) {
        throw new Error('Custodial wallet service not available');
      }

      const entityWallets = await custodialService.getWalletsForEntity(message.entityId);
      const roomWallets = message.roomId
        ? await custodialService.getWalletsForRoom(message.roomId)
        : [];

      let response = '📋 **Your Custodial Wallets:**\n\n';

      if (entityWallets.length === 0 && roomWallets.length === 0) {
        response += "No custodial wallets found. Create one with 'create custodial wallet'.";
      } else {
        if (entityWallets.length > 0) {
          response += '**👤 Personal Wallets:**\n';
          entityWallets.forEach((wallet, index) => {
            response += `${index + 1}. **${wallet.name || 'Unnamed'}**\n`;
            response += `   - ID: ${wallet.id}\n`;
            response += `   - Address: ${wallet.address}\n`;
            response += `   - Purpose: ${wallet.metadata.purpose}\n`;
            response += `   - Network: ${wallet.network}\n`;
            response += `   - Trust Level: ${wallet.metadata.trustLevel}\n\n`;
          });
        }

        if (roomWallets.length > 0) {
          response += '**🏢 Room Wallets:**\n';
          roomWallets.forEach((wallet, index) => {
            response += `${index + 1}. **${wallet.name || 'Unnamed'}**\n`;
            response += `   - ID: ${wallet.id}\n`;
            response += `   - Address: ${wallet.address}\n`;
            response += `   - Purpose: ${wallet.metadata.purpose}\n`;
            response += `   - Pool: ${wallet.isPool ? 'Yes' : 'No'}\n\n`;
          });
        }
      }

      callback?.({
        text: response,
        content: {
          success: true,
          entityWallets: entityWallets.length,
          roomWallets: roomWallets.length,
        },
      });

      return {
        success: true,
        data: { entityWallets, roomWallets },
        metadata: { action: 'list_custodial_wallets' },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback?.({
        text: `❌ Failed to list wallets: ${errorMessage}`,
        content: { success: false, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage,
        metadata: { action: 'list_custodial_wallets' },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Show me my custodial wallets',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll show you all the custodial wallets you have access to.",
          thought:
            "User wants to see their custodial wallets. I'll list both personal and room wallets.",
          actions: ['LIST_CUSTODIAL_WALLETS'],
        },
      },
    ],
  ],
};

/**
 * Transfer ownership of a custodial wallet
 */
export const transferWalletOwnershipAction: Action = {
  name: 'TRANSFER_WALLET_OWNERSHIP',
  similes: ['TRANSFER_OWNERSHIP', 'GIVE_WALLET', 'CHANGE_OWNER'],
  description: 'Transfer ownership of a custodial wallet to another entity',
  enabled: false, // Disabled by default - extremely dangerous, transfers wallet ownership and funds access

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
    if (!custodialService) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    const keywords = ['transfer ownership', 'transfer wallet', 'give wallet', 'change owner'];
    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
      if (!custodialService) {
        throw new Error('Custodial wallet service not available');
      }

      // Extract parameters
      const text = message.content.text || '';
      const params = await extractTransferParams(text, message, state || ({} as State));

      if (!params.walletId || !params.newOwnerId) {
        throw new Error('Please specify the wallet ID and new owner');
      }

      // Check permissions
      if (!(await custodialService.hasPermission(params.walletId, message.entityId, 'admin'))) {
        throw new Error("You don't have permission to transfer ownership of this wallet");
      }

      await custodialService.transferOwnership(
        params.walletId,
        params.newOwnerId,
        message.entityId
      );

      const response = `✅ Successfully transferred wallet ownership!

**Transfer Details:**
- 🆔 Wallet ID: ${params.walletId}
- 👤 New Owner: ${params.newOwnerId}
- 📅 Transfer Date: ${new Date().toLocaleDateString()}

The new owner now has full control over the wallet.`;

      callback?.({
        text: response,
        content: {
          success: true,
          walletId: params.walletId,
          newOwnerId: params.newOwnerId,
        },
      });

      return {
        success: true,
        data: { walletId: params.walletId, newOwnerId: params.newOwnerId },
        metadata: { action: 'transfer_wallet_ownership' },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback?.({
        text: `❌ Failed to transfer ownership: ${errorMessage}`,
        content: { success: false, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage,
        metadata: { action: 'transfer_wallet_ownership' },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Transfer ownership of wallet custodial-123 to alice',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll transfer ownership of the specified wallet to alice. This will give them full administrative control.",
          thought:
            'User wants to transfer wallet ownership. I need to verify they have admin permissions and execute the transfer.',
          actions: ['TRANSFER_WALLET_OWNERSHIP'],
        },
      },
    ],
  ],
};

/**
 * Add controller to a custodial wallet
 */
export const addWalletControllerAction: Action = {
  name: 'ADD_WALLET_CONTROLLER',
  similes: ['ADD_CONTROLLER', 'GIVE_ACCESS', 'ADD_USER'],
  description: 'Add a controller to a custodial wallet',
  enabled: false, // Disabled by default - can grant unauthorized access to cryptocurrency wallets

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
    if (!custodialService) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    const keywords = ['add controller', 'add user', 'give access', 'add to wallet'];
    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback
  ) => {
    try {
      const custodialService = runtime.getService<CustodialWalletService>('custodial-wallet');
      if (!custodialService) {
        throw new Error('Custodial wallet service not available');
      }

      const text = message.content.text || '';
      const params = await extractControllerParams(text, message, state || ({} as State));

      if (!params.walletId || !params.controllerId) {
        throw new Error('Please specify the wallet ID and controller entity ID');
      }

      if (!(await custodialService.hasPermission(params.walletId, message.entityId, 'admin'))) {
        throw new Error("You don't have permission to add controllers to this wallet");
      }

      await custodialService.addController(params.walletId, params.controllerId, message.entityId);

      const response = `✅ Successfully added wallet controller!

**Controller Details:**
- 🆔 Wallet ID: ${params.walletId}
- 👤 New Controller: ${params.controllerId}
- 🔑 Permissions: Transfer, View Balance

The new controller can now use this wallet for transactions.`;

      callback?.({
        text: response,
        content: {
          success: true,
          walletId: params.walletId,
          controllerId: params.controllerId,
        },
      });

      return {
        success: true,
        data: { walletId: params.walletId, controllerId: params.controllerId },
        metadata: { action: 'add_wallet_controller' },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      callback?.({
        text: `❌ Failed to add controller: ${errorMessage}`,
        content: { success: false, error: errorMessage },
      });

      return {
        success: false,
        error: errorMessage,
        metadata: { action: 'add_wallet_controller' },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Add bob as a controller to wallet custodial-456',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll add bob as a controller to the specified wallet. This will allow them to perform transactions.",
          thought:
            'User wants to add a controller to their wallet. I need to verify admin permissions and add the controller.',
          actions: ['ADD_WALLET_CONTROLLER'],
        },
      },
    ],
  ],
};

/**
 * Helper functions for parameter extraction
 */
async function extractWalletParams(
  text: string,
  message: Memory,
  _state?: State
): Promise<{
  name?: string;
  description?: string;
  entityId?: UUID;
  roomId?: UUID;
  worldId?: UUID;
  isPool?: boolean;
  purpose?: string;
  trustLevel?: number;
  maxBalance?: number;
  allowedTokens?: string[];
}> {
  const params: Record<string, unknown> = {};

  // Extract name
  const nameMatch = text.match(/name[:\s]+"([^"]+)"/i) || text.match(/called\s+"([^"]+)"/i);
  if (nameMatch) {
    params.name = nameMatch[1];
  }

  // Extract purpose
  const purposeMatch = text.match(/(?:for|purpose)\s+([a-zA-Z]+)/i);
  if (purposeMatch) {
    params.purpose = purposeMatch[1].toLowerCase();
  }

  // Check if it's a pool
  if (text.includes('pool') || text.includes('shared')) {
    params.isPool = true;
  }

  // Check if it's for room
  if (text.includes('room') || text.includes('team') || text.includes('group')) {
    params.roomId = message.roomId;
  }

  // Extract trust level
  const trustMatch = text.match(/trust\s+level\s+(\d+)/i);
  if (trustMatch) {
    params.trustLevel = Number.parseInt(trustMatch[1], 10);
  }

  return params;
}

async function extractTransferParams(
  text: string,
  _message: Memory,
  _state?: State
): Promise<{
  walletId?: UUID;
  newOwnerId?: UUID;
}> {
  const params: Record<string, unknown> = {};

  // Extract wallet ID - match various patterns
  const walletMatch =
    text.match(/wallet\s+([a-zA-Z0-9-]+)/i) || text.match(/wallet\s*([a-zA-Z0-9-]+)/i);
  if (walletMatch) {
    params.walletId = walletMatch[1] as UUID;
  }

  // Extract new owner - match "to <owner>"
  const ownerMatch = text.match(/to\s+([a-zA-Z0-9-]+)/i);
  if (ownerMatch) {
    params.newOwnerId = ownerMatch[1] as UUID;
  }

  return params;
}

async function extractControllerParams(
  text: string,
  _message: Memory,
  _state?: State
): Promise<{
  walletId?: UUID;
  controllerId?: UUID;
}> {
  const params: Record<string, unknown> = {};

  // Extract controller ID first (comes before wallet in test message)
  // Match "add controller <id>" or "controller <id>"
  const controllerMatch = text.match(/(?:add\s+)?controller\s+([a-zA-Z0-9-]+)/i);
  if (controllerMatch) {
    params.controllerId = controllerMatch[1] as UUID;
  }

  // Extract wallet ID - look for "to wallet <id>" or "wallet <id>"
  const walletMatch = text.match(/wallet\s+([a-zA-Z0-9-]+)/i);
  if (walletMatch) {
    params.walletId = walletMatch[1] as UUID;
  }

  return params;
}

export const custodialWalletActions = [
  createCustodialWalletAction,
  listCustodialWalletsAction,
  transferWalletOwnershipAction,
  addWalletControllerAction,
];
