/**
 * Individual Agent API Routes - GET, PUT, DELETE operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// Use dynamic imports to avoid database connection during build
const getAgentService = () =>
  import('@/lib/agents/service').then((m) => m.agentService);
const getAuthService = () =>
  import('@/lib/auth/session').then((m) => m.authService);

// Update agent validation schema
const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  avatarUrl: z.string().url().optional(),
  character: z
    .object({
      name: z.string(),
      bio: z.string(),
      messageExamples: z.array(z.array(z.string())).optional(),
      postExamples: z.array(z.string()).optional(),
      knowledge: z.array(z.string()).optional(),
    })
    .optional(),
  plugins: z.array(z.string()).optional(),
  runtimeConfig: z
    .object({
      models: z.record(z.string()).optional(),
      providers: z.array(z.string()).optional(),
      maxTokens: z.number().optional(),
      temperature: z.number().min(0).max(2).optional(),
      environment: z.record(z.string()).optional(),
    })
    .optional(),
  visibility: z.enum(['private', 'organization', 'public']).optional(),
});

/**
 * GET /api/agents/[id] - Get specific agent
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;

    // Get current user session
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the agent
    const agentService = await getAgentService();
    const agent = await agentService.getAgentById(
      user.organizationId,
      params.id,
    );
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/agents/[id] - Update specific agent
 */
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;

    // Get current user session
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get agent service
    const agentService = await getAgentService();

    // Check if agent exists
    const existingAgent = await agentService.getAgentById(
      user.organizationId,
      params.id,
    );
    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.error.errors,
        },
        { status: 400 },
      );
    }

    const data = validation.data;

    // Validate character configuration if provided
    if (data.character) {
      const characterValidation = agentService.validateCharacterConfig(
        data.character,
      );
      if (!characterValidation.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid character configuration',
            details: characterValidation.errors,
          },
          { status: 400 },
        );
      }
    }

    // Update the agent
    const updatedAgent = await agentService.updateAgent(
      user.organizationId,
      params.id,
      data,
      user.id,
    );

    if (!updatedAgent) {
      return NextResponse.json(
        { error: 'Failed to update agent' },
        { status: 500 },
      );
    }

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error('Error updating agent:', error);

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: 'Failed to update agent' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/agents/[id] - Delete specific agent
 */
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;

    // Get current user session
    const authService = await getAuthService();
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin role (required for deletion)
    if (!['owner', 'admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Get agent service
    const agentService = await getAgentService();

    // Check if agent exists
    const existingAgent = await agentService.getAgentById(
      user.organizationId,
      params.id,
    );
    if (!existingAgent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete the agent
    const success = await agentService.deleteAgent(
      user.organizationId,
      params.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete agent',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Agent deleted successfully',
      },
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete agent',
      },
      { status: 500 },
    );
  }
}
