/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session for subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/auth/session';
import Stripe from 'stripe';
import { loadConfig } from '@/lib/server/utils/config';

const config = loadConfig();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-02-24.acacia',
});
import { z } from 'zod';

const checkoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
  metadata: z.record(z.string()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = checkoutSchema.parse(body);

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: validatedData.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: validatedData.successUrl,
      cancel_url: validatedData.cancelUrl,
      metadata: {
        organizationId: session.organizationId,
        userId: session.userId,
        ...validatedData.metadata,
      },
      customer_creation: 'always',
    });

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to create checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
