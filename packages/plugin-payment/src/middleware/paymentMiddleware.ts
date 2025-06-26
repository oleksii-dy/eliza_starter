import {
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type UUID,
  asUUID,
  elizaLogger as logger,
} from '@elizaos/core';
import type { IPaymentService } from '../interfaces/IPaymentService';
import {
  type PaymentMiddlewareOptions,
  type PaymentRequest,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware to require payment before executing actions
 */
export function createPaymentMiddleware(options: PaymentMiddlewareOptions) {
  return async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    callback: HandlerCallback,
    next: () => Promise<void>
  ) => {
    try {
      logger.info('[PaymentMiddleware] Processing payment requirement', {
        amount: options.amount.toString(),
        method: options.method,
        action: message.content?.action,
      });

      // Get payment service
      const paymentService = runtime.getService('payment') as unknown as IPaymentService;
      if (!paymentService) {
        logger.error('[PaymentMiddleware] Payment service not found');
        await callback({
          text: 'Payment service is not available. Please try again later.',
          error: true,
        });
        return;
      }

      // Check if payment should be skipped
      if (await shouldSkipPayment(runtime, message, options)) {
        logger.info('[PaymentMiddleware] Skipping payment for privileged user');
        return next();
      }

      // Check if user has already paid for this action recently
      const recentPayment = await checkRecentPayment(runtime, message, options);
      if (recentPayment) {
        logger.info('[PaymentMiddleware] Using recent payment', { paymentId: recentPayment });
        return next();
      }

      // Create payment request
      const paymentRequest: PaymentRequest = {
        id: asUUID(uuidv4()),
        userId: message.entityId,
        agentId: runtime.agentId,
        actionName: (message.content?.action as string) || 'unknown',
        amount: options.amount,
        method: options.method || PaymentMethod.USDC_ETH,
        metadata: {
          ...options.metadata,
          messageId: message.id,
          roomId: message.roomId,
          action: message.content?.action,
        },
        requiresConfirmation: options.requiresConfirmation,
        trustRequired: options.trustRequired,
        minimumTrustLevel: options.minimumTrustLevel,
      };

      // Process payment
      const result = await paymentService.processPayment(paymentRequest, runtime);

      if (result.status === PaymentStatus.COMPLETED) {
        logger.info('[PaymentMiddleware] Payment completed successfully', {
          paymentId: result.id,
          transactionHash: result.transactionHash,
        });

        // Store payment in state for reference
        if (state) {
          state.paymentId = result.id;
          state.paymentStatus = result.status;
        }

        // Continue with the action
        return next();
      } else if (result.status === PaymentStatus.PENDING) {
        logger.info('[PaymentMiddleware] Payment pending confirmation', {
          paymentId: result.id,
        });

        await callback({
          text: `Payment of ${formatAmount(options.amount, options.method)} is required to continue. ${
            result.metadata?.authorizationUrl
              ? `Please authorize the payment here: ${result.metadata.authorizationUrl}`
              : 'Please confirm the payment to proceed.'
          }`,
          metadata: {
            paymentId: result.id,
            paymentStatus: result.status,
            requiresAction: true,
          },
        });

        // Don't continue - payment is pending

      } else {
        logger.error('[PaymentMiddleware] Payment failed', {
          paymentId: result.id,
          error: result.error,
        });

        await callback({
          text: `Payment failed: ${result.error || 'Unknown error'}. Please try again.`,
          error: true,
        });

        // Don't continue - payment failed

      }
    } catch (error) {
      logger.error('[PaymentMiddleware] Error processing payment', error);

      await callback({
        text: 'An error occurred while processing payment. Please try again.',
        error: true,
      });

      // Don't continue on error

    }
  };
}

/**
 * Check if payment should be skipped for this user
 */
async function shouldSkipPayment(
  runtime: IAgentRuntime,
  message: Memory,
  options: PaymentMiddlewareOptions
): Promise<boolean> {
  // Skip for agent's own actions
  if (message.entityId === runtime.agentId) {
    return true;
  }

  // Check skip options
  if (options.skipForOwner || options.skipForAdmin) {
    try {
      // Get user role from trust service if available
      const trustService = runtime.getService('trust');
      if (trustService) {
        const userRole = await (trustService as any).getUserRole?.(message.entityId);

        if (options.skipForOwner && userRole === 'owner') {
          return true;
        }

        if (options.skipForAdmin && (userRole === 'admin' || userRole === 'owner')) {
          return true;
        }
      }
    } catch (error) {
      logger.warn('[PaymentMiddleware] Error checking user role', error);
    }
  }

  return false;
}

/**
 * Check if user has a recent payment for this action
 */
async function checkRecentPayment(
  runtime: IAgentRuntime,
  message: Memory,
  options: PaymentMiddlewareOptions
): Promise<UUID | null> {
  try {
    const paymentService = runtime.getService('payment') as unknown as IPaymentService;
    if (!paymentService) {
      return null;
    }

    // Check payment history for recent payments
    const history = await paymentService.getPaymentHistory(
      message.entityId,
      10, // Last 10 payments
      0,
      runtime
    );

    // Look for a recent payment for the same action
    const recentCutoff = Date.now() - (options.metadata?.validityPeriod || 3600000); // 1 hour default

    for (const payment of history) {
      if (
        payment.status === PaymentStatus.COMPLETED &&
        payment.timestamp > recentCutoff &&
        payment.metadata?.action === message.content?.action &&
        payment.amount === options.amount &&
        payment.method === options.method
      ) {
        return payment.id;
      }
    }
  } catch (error) {
    logger.warn('[PaymentMiddleware] Error checking recent payments', error);
  }

  return null;
}

/**
 * Format amount for display
 */
function formatAmount(amount: bigint, method?: PaymentMethod): string {
  const methodDecimals: Record<PaymentMethod, number> = {
    [PaymentMethod.USDC_ETH]: 6,
    [PaymentMethod.USDC_SOL]: 6,
    [PaymentMethod.ETH]: 18,
    [PaymentMethod.SOL]: 9,
    [PaymentMethod.BTC]: 8,
    [PaymentMethod.MATIC]: 18,
    [PaymentMethod.ARB]: 18,
    [PaymentMethod.OP]: 18,
    [PaymentMethod.BASE]: 18,
    [PaymentMethod.OTHER]: 18,
  };

  const decimals = method ? methodDecimals[method] : 6;
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;

  const currency = method ? method.replace('_ETH', '').replace('_SOL', '') : 'USDC';

  if (fraction === BigInt(0)) {
    return `${whole} ${currency}`;
  }

  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole}.${fractionStr} ${currency}`;
}

/**
 * Decorator for actions that require payment
 */
export function requiresPayment(options: PaymentMiddlewareOptions) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      runtime: IAgentRuntime,
      message: Memory,
      state?: State,
      ...args: any[]
    ) {
      // Create a wrapped handler that includes payment middleware
      const middleware = createPaymentMiddleware(options);

      return new Promise((resolve, reject) => {
        middleware(
          runtime,
          message,
          state,
          async (response) => {
            // If payment failed, return the error response
            if ((response as any).error) {
              resolve(response);
              return [];
            }

            // If payment requires action, return the pending response
            if ((response as any).metadata?.requiresAction) {
              resolve(response);
              return [];
            }
            return [];
          },
          async () => {
            // Payment successful, execute the original method
            try {
              const result = await originalMethod.apply(this, [runtime, message, state, ...args]);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          }
        );
      });
    };

    return descriptor;
  };
}
