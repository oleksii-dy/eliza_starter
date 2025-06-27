/**
 * Batch Generation API Routes
 * POST /api/v1/generation/batch - Create batch generation
 */

import { NextRequest } from 'next/server';
import { withMiddleware } from '@/lib/domains/generation/api/middleware';
import { batchGenerateHandler } from '@/lib/domains/generation/api/handlers/batch';

export async function handlePOST(req: NextRequest) {
  return withMiddleware(req, batchGenerateHandler);
}
