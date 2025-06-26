/**
 * POST /api/billing/checkout-session
 * Create a Stripe checkout session for credit purchase using the real billing service
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/auth/session';
import { createPaymentIntent, createStripeCustomer } from '@/lib/server/services/billing-service';
import { getDatabase } from '@/lib/database';
import { organizations } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import Stripe from 'stripe';
import { loadConfig } from '@/lib/server/utils/config';

const config = loadConfig();
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-02-24.acacia',
});

const checkoutSessionSchema = z.object({
  amount: z.number().min(5).max(10000), // $5 to $10,000
  currency: z.string().optional().default('usd'),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
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
    const validatedData = checkoutSessionSchema.parse(body);

    const db = await getDatabase();
    
    // Get organization details
    const [organization] = await db
      .select({
        stripeCustomerId: organizations.stripeCustomerId,
        name: organizations.name,
        billingEmail: organizations.billingEmail,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Ensure Stripe customer exists
    let customerId = organization.stripeCustomerId;
    if (!customerId) {
      customerId = await createStripeCustomer(
        session.organizationId,
        organization.billingEmail || session.email,
        organization.name
      );
    }

    // Create Stripe checkout session for credit purchase
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: validatedData.currency,
            product_data: {
              name: 'ElizaOS Credits',
              description: `$${validatedData.amount} in credits for your ElizaOS account`,
            },
            unit_amount: Math.round(validatedData.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer: customerId,
      success_url: validatedData.successUrl,
      cancel_url: validatedData.cancelUrl,
      metadata: {
        organizationId: session.organizationId,
        userId: session.userId,
        creditAmount: validatedData.amount.toString(),
        type: 'credit_purchase',
      },
      payment_intent_data: {
        metadata: {
          organizationId: session.organizationId,
          userId: session.userId,
          creditAmount: validatedData.amount.toString(),
          type: 'credit_purchase',
        },
      },
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
