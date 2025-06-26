/**
 * GET/PUT /api/billing/settings
 * Manage billing settings for the current organization
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/auth/session';
import { initializeDatabase } from '@/lib/database/server';
import { organizations } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const settingsSchema = z.object({
  autoTopUpEnabled: z.boolean(),
  autoTopUpAmount: z.number().min(5).max(1000),
  creditThreshold: z.number().min(0).max(100),
  lowBalanceAlerts: z.boolean(),
  emailNotifications: z.boolean(),
  weeklyReports: z.boolean(),
  billingEmail: z.string().email().optional(),
});

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adapter = await initializeDatabase();
    const db = adapter.getDatabase();

    // Get organization settings
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = {
      autoTopUpEnabled: organization.autoTopUpEnabled,
      autoTopUpAmount: parseFloat(organization.autoTopUpAmount),
      creditThreshold: parseFloat(organization.creditThreshold),
      billingEmail: organization.billingEmail || '',
      subscriptionTier: organization.subscriptionTier,
      // Get notification preferences from settings
      lowBalanceAlerts: organization.settings?.notifications?.lowBalance ?? true,
      emailNotifications: organization.settings?.notifications?.email ?? true,
      weeklyReports: organization.settings?.notifications?.weeklyReports ?? false,
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error('Failed to get billing settings:', error);
    return NextResponse.json(
      { error: 'Failed to get billing settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get user session
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validatedData = settingsSchema.parse(body);

    const adapter = await initializeDatabase();
    const db = adapter.getDatabase();

    // Get current settings
    const [currentOrg] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    if (!currentOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Merge notification settings
    const currentSettings = currentOrg.settings || {};
    const updatedSettings = {
      ...currentSettings,
      notifications: {
        ...currentSettings.notifications,
        lowBalance: validatedData.lowBalanceAlerts,
        email: validatedData.emailNotifications,
        weeklyReports: validatedData.weeklyReports,
      },
    };

    // Update organization settings
    await db
      .update(organizations)
      .set({
        autoTopUpEnabled: validatedData.autoTopUpEnabled,
        autoTopUpAmount: validatedData.autoTopUpAmount.toString(),
        creditThreshold: validatedData.creditThreshold.toString(),
        billingEmail: validatedData.billingEmail || null,
        settings: updatedSettings,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, session.organizationId));

    return NextResponse.json({
      success: true,
      message: 'Billing settings updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Failed to update billing settings:', error);
    return NextResponse.json(
      { error: 'Failed to update billing settings' },
      { status: 500 }
    );
  }
}