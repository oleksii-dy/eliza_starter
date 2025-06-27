/**
 * Individual API Key Management Routes
 * Handles operations on specific API keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { wrapHandlers } from '@/lib/api/route-wrapper';

// Use dynamic imports to avoid database connection during build
const getApiKeyService = () =>
  import('@/lib/api-keys/service').then((m) => m.apiKeyService);
const getAuthService = () =>
  import('@/lib/auth/session').then((m) => m.authService);
const getPermissionService = () =>
  import('@/lib/auth/permissions').then((m) => m.permissionService);

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/api-keys/[id] - Get specific API key details
 */
async function handleGET(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const permissionService = await getPermissionService();
    const canViewApiKeys = await permissionService.hasPermission(
      user.id,
      'api_keys:read',
    );
    if (!canViewApiKeys) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const apiKeyService = await getApiKeyService();
    const apiKey = await apiKeyService.getApiKey(
      user.organizationId,
      params.id,
    );

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Sanitize the response
    const sanitizedKey = {
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      createdBy: apiKey.createdBy,
      isActive: apiKey.isActive,
      usageCount: apiKey.usageCount,
      keyPreview: apiKey.keyPrefix || '...****',
    };

    return NextResponse.json({ apiKey: sanitizedKey });
  } catch (error) {
    console.error('Error fetching API key:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API key' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/api-keys/[id] - Update API key
 */
async function handlePUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const permissionService = await getPermissionService();
    const canUpdateApiKeys = await permissionService.hasPermission(
      user.id,
      'api_keys:write',
    );
    if (!canUpdateApiKeys) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Validate request body
    const updateKeySchema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      scopes: z.array(z.string()).min(1).optional(),
      isActive: z.boolean().optional(),
    });

    const body = await request.json();
    const validation = updateKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 },
      );
    }

    const apiKeyService = await getApiKeyService();
    const updatedKey = await apiKeyService.updateApiKey(
      user.organizationId,
      params.id,
      validation.data,
    );

    if (!updatedKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Sanitize the response
    const sanitizedKey = {
      id: updatedKey.id,
      name: updatedKey.name,
      description: updatedKey.description,
      scopes: updatedKey.scopes,
      isActive: updatedKey.isActive,
      updatedAt: updatedKey.updatedAt,
    };

    return NextResponse.json({ apiKey: sanitizedKey });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/api-keys/[id] - Delete specific API key
 */
async function handleDELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const permissionService = await getPermissionService();
    const canDeleteApiKeys = await permissionService.hasPermission(
      user.id,
      'api_keys:delete',
    );
    if (!canDeleteApiKeys) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const apiKeyService = await getApiKeyService();
    const deleted = await apiKeyService.deleteApiKey(
      user.organizationId,
      params.id,
    );

    if (!deleted) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 },
    );
  }
}

// Export with security headers and authentication
export const { GET, PUT, DELETE } = wrapHandlers({
  handleGET,
  handlePUT,
  handleDELETE,
});
