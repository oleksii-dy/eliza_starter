/**
 * API Keys Management Routes
 * Handles creation and management of API keys for organizations
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

/**
 * GET /api/api-keys - List API keys for organization
 */
async function handleGET(request: NextRequest) {
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
    const apiKeys = await apiKeyService.getApiKeys(user.organizationId);

    // Don't return the actual key values for security
    const sanitizedKeys = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      description: key.description,
      scopes: key.scopes,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
      createdBy: key.createdBy,
      isActive: key.isActive,
      // Only show last 4 characters of key
      keyPreview: key.key ? `...${key.key.slice(-4)}` : null,
    }));

    return NextResponse.json({ apiKeys: sanitizedKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/api-keys - Create new API key
 */
async function handlePOST(request: NextRequest) {
  try {
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const permissionService = await getPermissionService();
    const canCreateApiKeys = await permissionService.hasPermission(
      user.id,
      'api_keys:write',
    );
    if (!canCreateApiKeys) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Validate request body
    const createKeySchema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      scopes: z.array(z.string()).min(1),
      expiresIn: z.number().min(1).max(365).optional(), // Days
    });

    const body = await request.json();
    const validation = createKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 },
      );
    }

    const apiKeyService = await getApiKeyService();
    const newKey = await apiKeyService.createApiKey({
      organizationId: user.organizationId,
      createdBy: user.id,
      name: validation.data.name,
      description: validation.data.description,
      scopes: validation.data.scopes,
      expiresIn: validation.data.expiresIn,
    });

    // Return the full key only once on creation
    return NextResponse.json(
      {
        apiKey: {
          id: newKey.id,
          key: newKey.key, // Full key shown only on creation
          name: newKey.name,
          description: newKey.description,
          scopes: newKey.scopes,
          expiresAt: newKey.expiresAt,
          createdAt: newKey.createdAt,
        },
        warning:
          'Please save this API key securely. You will not be able to see it again.',
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { error: 'Failed to create API key' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/api-keys - Bulk delete API keys
 */
async function handleDELETE(request: NextRequest) {
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

    // Validate request body
    const deleteSchema = z.object({
      ids: z.array(z.string().uuid()).min(1),
    });

    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 },
      );
    }

    const apiKeyService = await getApiKeyService();
    const result = await apiKeyService.deleteApiKeys(
      user.organizationId,
      validation.data.ids,
    );

    return NextResponse.json({
      deleted: result.deleted,
      failed: result.failed,
    });
  } catch (error) {
    console.error('Error deleting API keys:', error);
    return NextResponse.json(
      { error: 'Failed to delete API keys' },
      { status: 500 },
    );
  }
}

// Export with security headers and authentication
export const { GET, POST, DELETE } = wrapHandlers({
  handleGET,
  handlePOST,
  handleDELETE,
});
