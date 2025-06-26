import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/api/middleware';
import { db } from '@/lib/api/database';
import { z } from 'zod';

const createOrgSchema = z.object({
  name: z.string().min(1).max(100)
});

// GET /api/v1/organizations - List organizations
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  
  const organizations = await db.organizations.findByOwnerId(user.id);
  
  return NextResponse.json({
    success: true,
    data: {
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        ownerId: org.ownerId,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt
      }))
    }
  });
});

// POST /api/v1/organizations - Create organization
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  const user = request.user!;
  
  try {
    const body = await request.json();
    
    // Validate input
    const validation = createOrgSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      );
    }
    
    const { name } = validation.data;
    
    // Create organization
    const organization = await db.organizations.create({
      name,
      ownerId: user.id
    });
    
    return NextResponse.json(
      {
        success: true,
        data: {
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            ownerId: organization.ownerId,
            createdAt: organization.createdAt,
            updatedAt: organization.updatedAt
          }
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create organization error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}); 