/**
 * Generation Analytics API Routes
 * GET /api/v1/generation/analytics - Get generation analytics
 */

import { NextRequest } from 'next/server';
import { withMiddleware } from '@/lib/domains/generation/api/middleware';
import { analyticsHandler } from '@/lib/domains/generation/api/handlers/analytics';

export async function GET(req: NextRequest) {
  return withMiddleware(req, analyticsHandler);
}