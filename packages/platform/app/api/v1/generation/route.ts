/**
 * Generation API Routes
 * POST /api/v1/generation - Create new generation
 * GET /api/v1/generation - List generations
 */

import { NextRequest } from 'next/server';
import { withMiddleware } from '@/lib/domains/generation/api/middleware';
import { generateHandler } from '@/lib/domains/generation/api/handlers/generate';
import { listHandler } from '@/lib/domains/generation/api/handlers/list';

export async function POST(req: NextRequest) {
  return withMiddleware(req, generateHandler);
}

export async function GET(req: NextRequest) {
  return withMiddleware(req, listHandler);
}