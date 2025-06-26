import { NextRequest, NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as yaml from 'js-yaml';

export async function GET(request: NextRequest) {
  try {
    const yamlPath = join(process.cwd(), 'lib', 'openapi-spec.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    
    // Parse YAML and return as JSON for Swagger UI
    const spec = yaml.load(yamlContent);
    
    return NextResponse.json(spec, {
      headers: {
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