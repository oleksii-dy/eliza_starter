import {
  type Provider,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { CrossMintService } from '../services/CrossMintService';

/**
 * CrossMint Payments Provider
 * Provides information about X.402 payment requests and capabilities
 */
export const crossmintPaymentsProvider: Provider = {
  name: 'CROSSMINT_PAYMENTS',
  description: 'Provides recent X.402 payment request history and HTTP-native payment protocol capabilities when agent needs to process blockchain payments or verify transaction status',
  dynamic: true, // Only when explicitly requested
  position: 15,

  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    try {
      const crossmintService = runtime.getService<CrossMintService>('crossmint');

      if (!crossmintService) {
        return {
          text: '',
          values: {},
        };
      }

      // Get recent payments (this would be filtered in production)
      const payments = await crossmintService.listPayments();
      const recentPayments = payments.slice(0, 5); // Limit to 5 most recent

      const supportedNetworks = crossmintService.getSupportedNetworks();

      const paymentsList = recentPayments
        .map(payment =>
          `- ${payment.id}: ${payment.amount} ${payment.currency} (${payment.status}) on ${payment.network}`
        )
        .join('\n');

      const text = `[CROSSMINT X.402 PAYMENTS]
Recent Payments (Last 5):
${paymentsList || '- No recent payments found'}

X.402 Payment Protocol Capabilities:
- HTTP-native payment requests
- Cross-chain payment support
- Automatic settlement and verification
- Enterprise-grade infrastructure
- Webhook integration for real-time updates

Supported Networks: ${supportedNetworks.join(', ')}

Payment Request Features:
- Automatic expiration handling
- Metadata and custom data support
- Redirect URLs for completion flows
- Real-time status updates
- Compliance with X.402 standard

Available Actions:
- CREATE_X402_PAYMENT: Create new payment request
- CHECK_PAYMENT_STATUS: Verify payment completion
[/CROSSMINT X.402 PAYMENTS]`;

      return {
        text,
        values: {
          crossmintRecentPayments: recentPayments.length,
          crossmintSupportedNetworks: supportedNetworks,
          crossmintX402Compliant: true,
          crossmintPaymentCapabilities: [
            'HTTP_NATIVE_PAYMENTS',
            'CROSS_CHAIN_SUPPORT',
            'AUTOMATIC_SETTLEMENT',
            'REAL_TIME_VERIFICATION',
            'WEBHOOK_INTEGRATION',
          ],
        },
        data: {
          crossmintPayments: recentPayments,
          crossmintSupportedNetworks: supportedNetworks,
        },
      };
    } catch (error) {
      logger.error('Error in CrossMint payments provider:', error);

      return {
        text: '[CROSSMINT X.402 PAYMENTS]\nPayment information temporarily unavailable\n[/CROSSMINT X.402 PAYMENTS]',
        values: {
          crossmintRecentPayments: 0,
          crossmintError: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
};
