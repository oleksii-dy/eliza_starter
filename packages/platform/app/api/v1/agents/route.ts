/**
 * Agent Management API
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { z } from 'zod';

// Use dynamic imports to avoid database connection during build
const getAgentService = () =>
  import('@/lib/agents/service').then((m) => m.AgentService);

// Character configuration schema for better type safety
const characterSchema = z.object({
  name: z.string(),
  username: z.string().optional(),
  system: z.string().optional(),
  bio: z.union([z.string(), z.array(z.string())]),
  messageExamples: z.array(z.array(z.object({
    user: z.string(),
    content: z.object({
      text: z.string(),
      action: z.string().optional(),
    })
  }))).optional(),
  knowledge: z.array(z.union([
    z.string(),
    z.object({
      path: z.string(),
      shared: z.boolean().optional()
    })
  ])).optional(),
  plugins: z.array(z.string()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  secrets: z.record(z.string(), z.union([z.string(), z.boolean(), z.number()])).optional(),
}).passthrough(); // Allow additional properties for extensibility

// Runtime configuration schema
const runtimeConfigSchema = z.object({
  models: z.record(z.string(), z.string()).optional(),
  providers: z.array(z.string()).optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  environment: z.record(z.string(), z.string()).optional(),
}).strict();

// Main agent creation schema
const createAgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(100),
  description: z.string().max(1000).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens').optional(),
  avatarUrl: z.string().url('Avatar URL must be valid').optional(),
  character: characterSchema,
  plugins: z.array(z.string().min(1)).optional(),
  runtimeConfig: runtimeConfigSchema.optional(),
  visibility: z.enum(['private', 'organization', 'public']).optional(),
}).strict();

// Query parameters validation schema
const listAgentsQuerySchema = z.object({
  limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1).max(100)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(0)).optional(),
  search: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'inactive', 'error']).optional(),
});

/**
 * GET /api/v1/agents - List agents for organization
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;

    const searchParams = new URL(request.url).searchParams;
    
    // Validate query parameters
    const queryValidation = listAgentsQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
    });
    
    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: queryValidation.error.errors,
        },
        { status: 400 }
      );
    }
    
    const { limit = 50, offset = 0, search, status } = queryValidation.data;

    const AgentService = await getAgentService();
    const agentService = new AgentService();
    const agents = await agentService.getAgents(user.organizationId, {
      limit: limit || 50,
      offset: offset || 0,
      search,
      status,
    });

    return NextResponse.json({ agents }, { status: 200 });
  } catch (error) {
    console.error('GET /api/v1/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/v1/agents - Create new agent
 */
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const user = request.user!;

    const body = await request.json();

    // Validate request body
    const validationResult = createAgentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const agentData = validationResult.data;

    const AgentService = await getAgentService();
    const agentService = new AgentService();

    // Generate slug if not provided
    if (!agentData.slug) {
      agentData.slug = await agentService.generateUniqueSlug(user.organizationId, agentData.name);
    }

    // Set default values
    const createRequest = {
      name: agentData.name,
      description: agentData.description,
      slug: agentData.slug,
      avatarUrl: agentData.avatarUrl,
      character: agentData.character,
      plugins: agentData.plugins || [],
      runtimeConfig: agentData.runtimeConfig || {},
      visibility: agentData.visibility || 'private',
    };

    // Validate character config
    const characterValidation = agentService.validateCharacterConfig(createRequest.character);
    if (!characterValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid character configuration',
          details: characterValidation.errors,
        },
        { status: 400 }
      );
    }

    const agent = await agentService.createAgent(
      user.organizationId,
      user.id,
      createRequest
    );

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/agents error:', error);

    if (error instanceof Error && error.message.includes('slug already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
});
