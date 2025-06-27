/**
 * Iframe Token Utilities
 */

import { jwtVerify } from 'jose';

// JWT secret for iframe tokens (separate from main auth)
function getIframeJWTSecret(): Uint8Array {
  const secret = process.env.IFRAME_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'IFRAME_JWT_SECRET environment variable is required for production',
    );
  }
  if (secret.length < 32) {
    throw new Error('IFRAME_JWT_SECRET must be at least 32 characters long');
  }
  return new TextEncoder().encode(secret);
}

const IFRAME_JWT_SECRET = getIframeJWTSecret();

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
 * Verify iframe token (utility function for other API endpoints)
 */
export async function verifyIframeToken(
  token: string,
): Promise<IframeTokenData | null> {
  try {
    const { payload } = await jwtVerify(token, IFRAME_JWT_SECRET, {
      issuer: 'elizaos-platform-iframe',
      audience: 'elizaos-iframe-editor',
    });

    return payload as unknown as IframeTokenData;
  } catch (error) {
    console.error('Iframe token verification failed:', error);
    return null;
  }
}
