import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const yamlPath = join(process.cwd(), 'lib', 'openapi-spec.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');

    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'application/yaml',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to load OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to load API documentation' },
      { status: 500 }
    );
  }
}
