/**
 * API Keys Management Endpoints
 * Handles creation, listing, and management of API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/auth/session';
import { getDatabase } from '@/lib/database';
import { apiKeys, organizations } from '@/lib/database/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { createHash } from 'crypto';

// Available permissions for API keys
const AVAILABLE_PERMISSIONS = [
  'agents:read',
  'agents:write',
  'agents:delete',
  'memory:read',
  'memory:write',
  'memory:delete',
  'messaging:read',
  'messaging:write',
  'audio:read',
  'audio:write',
  'media:read',
  'media:write',
  'admin'
];

function generateApiKey(): string {
  const prefix = 'eli_';
  const key = nanoid(48); // Generate a 48-character random string
  return prefix + key;
}

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 8) + '...';
}

// GET /api/api-keys - List API keys with stats
export async function GET(request: NextRequest) {
  try {
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all API keys for the organization
    const db = await getDatabase();
    const userApiKeys = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        description: apiKeys.description,
        keyPrefix: apiKeys.keyPrefix,
        permissions: apiKeys.permissions,
        rateLimit: apiKeys.rateLimit,
        isActive: apiKeys.isActive,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        usageCount: apiKeys.usageCount,
        createdAt: apiKeys.createdAt,
        updatedAt: apiKeys.updatedAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, session.organizationId))
      .orderBy(desc(apiKeys.createdAt));

    // Calculate stats
    const totalKeys = userApiKeys.length;
    const activeKeys = userApiKeys.filter((key: any) => key.isActive).length;
    const expiredKeys = userApiKeys.filter((key: any) => key.expiresAt && new Date(key.expiresAt) < new Date()).length;
    const totalUsage = userApiKeys.reduce((sum: number, key: any) => sum + (key.usageCount || 0), 0);

    const stats = {
      totalKeys,
      activeKeys,
      expiredKeys,
      totalUsage,
    };

    return NextResponse.json({
      success: true,
      data: {
        apiKeys: userApiKeys.map((key: any) => ({
          ...key,
          permissions: key.permissions || [],
        })),
        stats,
        availablePermissions: AVAILABLE_PERMISSIONS,
      },
    });
  } catch (error) {
    console.error('Failed to list API keys:', error);
    return NextResponse.json(
      { error: { message: 'Failed to list API keys' } },
      { status: 500 }
    );
  }
}

// POST /api/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, permissions, rateLimit, expiresAt } = body;

    // Validate input
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: { message: 'Name is required' } },
        { status: 400 }
      );
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: { message: 'At least one permission is required' } },
        { status: 400 }
      );
    }

    // Validate permissions
    const invalidPermissions = permissions.filter(p => !AVAILABLE_PERMISSIONS.includes(p));
    if (invalidPermissions.length > 0) {
      return NextResponse.json(
        { error: { message: `Invalid permissions: ${invalidPermissions.join(', ')}` } },
        { status: 400 }
      );
    }

    // Generate API key
    const newApiKey = generateApiKey();
    const hashedKey = hashApiKey(newApiKey);
    const keyPrefix = getKeyPrefix(newApiKey);

    // Create API key in database
    const db = await getDatabase();
    const [createdApiKey] = await db
      .insert(apiKeys)
      .values({
        id: nanoid(),
        organizationId: session.organizationId,
        userId: session.userId,
        name: name.trim(),
        description: description?.trim() || '',
        keyHash: hashedKey,
        keyPrefix,
        permissions,
        rateLimit: rateLimit || 100,
        isActive: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Return the API key data with the full key (only shown once)
    return NextResponse.json({
      success: true,
      data: {
        key: newApiKey, // Full key shown only on creation
        apiKey: {
          id: createdApiKey.id,
          name: createdApiKey.name,
          description: createdApiKey.description,
          keyPrefix: createdApiKey.keyPrefix,
          permissions: createdApiKey.permissions || [],
          rateLimit: createdApiKey.rateLimit,
          isActive: createdApiKey.isActive,
          expiresAt: createdApiKey.expiresAt,
          lastUsedAt: createdApiKey.lastUsedAt,
          usageCount: createdApiKey.usageCount,
          createdAt: createdApiKey.createdAt,
          updatedAt: createdApiKey.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Failed to create API key:', error);
    return NextResponse.json(
      { error: { message: 'Failed to create API key' } },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys - Delete API key
export async function DELETE(request: NextRequest) {
  try {
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');

    if (!keyId) {
      return NextResponse.json(
        { error: { message: 'API key ID is required' } },
        { status: 400 }
      );
    }

    // Verify the API key belongs to the user's organization
    const db = await getDatabase();
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.organizationId, session.organizationId)
        )
      )
      .limit(1);

    if (!existingKey) {
      return NextResponse.json(
        { error: { message: 'API key not found' } },
        { status: 404 }
      );
    }

    // Delete the API key
    await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, keyId));

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: { message: 'Failed to delete API key' } },
      { status: 500 }
    );
  }
}