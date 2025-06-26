/**
 * POST /api/billing/payment-intent
 * Create a Stripe payment intent for credit purchase
 */

import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/session';
import { createPaymentIntent, createStripeCustomer } from '@/lib/server/services/billing-service';
import { getDatabase, organizations } from '@/lib/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { ApiErrorHandler, ErrorCode, withErrorHandling } from '@/lib/api/error-handler';

const paymentIntentSchema = z.object({
  amount: z.number().min(5).max(10000), // $5 to $10,000
  currency: z.string().optional().default('usd'),
  metadata: z.record(z.string()).optional(),
});

async function postHandler(request: NextRequest) {
  // Get current user session
  const user = await authService.getCurrentUser();
  if (!user) {
    return ApiErrorHandler.error(ErrorCode.UNAUTHORIZED, 'Authentication required');
  }

  // Parse request body
  const body = await request.json();
  
  try {
    var validatedData = paymentIntentSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ApiErrorHandler.error(
        ErrorCode.VALIDATION_ERROR,
        'Invalid request data',
        { validationErrors: error.errors }
      );
    }
    throw error;
  }

  // Check if organization has a Stripe customer
  const db = await getDatabase();
  const [organization] = await db
    .select({
      stripeCustomerId: organizations.stripeCustomerId,
      billingEmail: organizations.billingEmail,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, user.organizationId))
    .limit(1);

  if (!organization) {
    return ApiErrorHandler.error(ErrorCode.ORGANIZATION_NOT_FOUND, 'Organization not found');
  }

  // Create Stripe customer if doesn't exist
  let stripeCustomerId = organization.stripeCustomerId;
  if (!stripeCustomerId) {
    stripeCustomerId = await createStripeCustomer(
      user.organizationId,
      organization.billingEmail || user.email,
      organization.name
    );
  }

  // Create payment intent
  const paymentIntent = await createPaymentIntent(
    user.organizationId,
    validatedData.amount,
    validatedData.currency
  );

  return ApiErrorHandler.success({
    clientSecret: paymentIntent.client_secret,
    amount: validatedData.amount,
    currency: validatedData.currency,
    paymentIntentId: paymentIntent.id,
  });
}

export const POST = withErrorHandling(postHandler);
