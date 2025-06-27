/**
 * Iframe Authentication Token API
 * Generates temporary tokens for iframe authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import { wrapHandlers } from '@/lib/api/route-wrapper';
import { SignJWT } from 'jose';
import crypto from 'crypto';
import { authService } from '@/lib/auth/session';

// JWT secret for iframe tokens (separate from main auth)
const IFRAME_JWT_SECRET = new TextEncoder().encode(
  process.env.IFRAME_JWT_SECRET ||
    'iframe-jwt-secret-key-at-least-32-characters-long',
);

// Iframe token duration (shorter than main session)
const IFRAME_TOKEN_DURATION = 30 * 60 * 1000; // 30 minutes

export interface IframeTokenData {
  userId: string;
  organizationId: string;
  email: string;
  role: string;
  isAdmin: boolean;
  tokenId: string;
  purpose: 'iframe-auth';
}

/**
 * POST /api/auth/iframe-token - Generate iframe authentication token
 */
async function handlePOST(request: NextRequest) {
  try {
    // Get current user session
    const user = await authService.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization
    const organization = await authService.getCurrentOrganization();
    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 },
      );
    }

    // Generate unique token ID for tracking
    const tokenId = crypto.randomBytes(16).toString('hex');

    // Create iframe token data
    const tokenData: IframeTokenData = {
      userId: user.id,
      organizationId: organization.id,
      email: user.email,
      role: user.role,
      isAdmin: ['owner', 'admin'].includes(user.role),
      tokenId,
      purpose: 'iframe-auth',
    };

    // Create JWT token
    const token = await new SignJWT(tokenData as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(
        Math.floor((Date.now() + IFRAME_TOKEN_DURATION) / 1000),
      )
      .setIssuer('elizaos-platform-iframe')
      .setAudience('elizaos-iframe-editor')
      .setSubject(user.id)
      .setJti(tokenId)
      .sign(IFRAME_JWT_SECRET);

    // Return token with metadata
    return NextResponse.json({
      token,
      tokenId,
      expiresAt: new Date(Date.now() + IFRAME_TOKEN_DURATION).toISOString(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    });
  } catch (error) {
    console.error('Error generating iframe token:', error);
    return NextResponse.json(
      { error: 'Failed to generate iframe token' },
      { status: 500 },
    );
  }
}

export const { POST } = wrapHandlers({ handlePOST });
