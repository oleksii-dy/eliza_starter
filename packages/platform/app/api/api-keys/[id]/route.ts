/**
 * Individual API Key Management
 * Handles updating and deleting specific API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '@/lib/auth/session';
import { getDatabase } from '@/lib/database';
import { apiKeys } from '@/lib/database/schema';
import { eq, and } from 'drizzle-orm';

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

// PUT /api/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: keyId } = await params;
    const body = await request.json();
    const { name, description, permissions, rateLimit, isActive } = body;

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

    // Validate input
    if (name && !name.trim()) {
      return NextResponse.json(
        { error: { message: 'Name cannot be empty' } },
        { status: 400 }
      );
    }

    if (permissions && Array.isArray(permissions)) {
      const invalidPermissions = permissions.filter(p => !AVAILABLE_PERMISSIONS.includes(p));
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          { error: { message: `Invalid permissions: ${invalidPermissions.join(', ')}` } },
          { status: 400 }
        );
      }
    }

    // Update the API key
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || '';
    if (permissions !== undefined) updateData.permissions = permissions;
    if (rateLimit !== undefined) updateData.rateLimit = rateLimit;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedKey] = await db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, keyId))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          description: updatedKey.description,
          keyPrefix: updatedKey.keyPrefix,
          permissions: updatedKey.permissions || [],
          rateLimit: updatedKey.rateLimit,
          isActive: updatedKey.isActive,
          expiresAt: updatedKey.expiresAt,
          lastUsedAt: updatedKey.lastUsedAt,
          usageCount: updatedKey.usageCount,
          createdAt: updatedKey.createdAt,
          updatedAt: updatedKey.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Failed to update API key:', error);
    return NextResponse.json(
      { error: { message: 'Failed to update API key' } },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: keyId } = await params;

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