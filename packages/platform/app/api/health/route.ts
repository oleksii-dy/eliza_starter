/**
 * Health Check API Route
 * Provides comprehensive system health monitoring for production
 */

import { NextRequest, NextResponse } from 'next/server';

// Use dynamic imports to avoid database connection during build
const getDatabaseUtils = () => import('@/lib/database/connection').then((m) => ({ getDatabaseHealth: m.getDatabaseHealth, getDatabaseStats: m.getDatabaseStats }));

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
      stats?: {
        totalConnections: number;
        activeConnections: number;
        idleConnections: number;
        totalQueries: number;
      };
    };
    environment: {
      status: 'healthy' | 'unhealthy';
      nodeEnv: string;
      version: string;
      uptime: number;
    };
    externalServices: {
      status: 'healthy' | 'degraded' | 'unhealthy';
      services: {
        openai: 'healthy' | 'unhealthy' | 'unknown';
        stripe: 'healthy' | 'unhealthy' | 'unknown';
      };
    };
  };
  uptime: number;
  version: string;
}

async function checkExternalServices() {
  const services: {
    openai: 'healthy' | 'unhealthy' | 'unknown';
    stripe: 'healthy' | 'unhealthy' | 'unknown';
  } = {
    openai: 'unknown',
    stripe: 'unknown',
  };

  // Check OpenAI (simple endpoint check)
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      services.openai = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      services.openai = 'unhealthy';
    }
  }

  // Check Stripe (simple endpoint check)
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const response = await fetch('https://api.stripe.com/v1/account', {
        headers: {
          'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      services.stripe = response.ok ? 'healthy' : 'unhealthy';
    } catch {
      services.stripe = 'unhealthy';
    }
  }

  const healthyCount = Object.values(services).filter(s => s === 'healthy').length;
  const totalServices = Object.values(services).filter(s => s !== 'unknown').length;
  
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (totalServices === 0) {
    status = 'healthy'; // No external services configured
  } else if (healthyCount === 0) {
    status = 'unhealthy';
  } else if (healthyCount < totalServices) {
    status = 'degraded';
  }

  return { status, services };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // During build time, return a simplified healthy response
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'healthy' },
          environment: {
            status: 'healthy',
            nodeEnv: process.env.NODE_ENV || 'unknown',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
          },
          externalServices: {
            status: 'healthy',
            services: { openai: 'unknown', stripe: 'unknown' },
          },
        },
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      }, { status: 200 });
    }

    // Get database utils using dynamic imports
    const { getDatabaseHealth, getDatabaseStats } = await getDatabaseUtils();

    // Run health checks in parallel
    const [databaseHealth, externalServices] = await Promise.allSettled([
      (async () => {
        const dbStartTime = Date.now();
        try {
          const isHealthy = await getDatabaseHealth();
          const stats = await getDatabaseStats();
          const responseTime = Date.now() - dbStartTime;
          
          return {
            status: isHealthy ? 'healthy' as const : 'unhealthy' as const,
            responseTime,
            stats,
          };
        } catch (error) {
          return {
            status: 'unhealthy' as const,
            responseTime: Date.now() - dbStartTime,
            error: error instanceof Error ? error.message : 'Unknown database error',
          };
        }
      })(),
      checkExternalServices(),
    ]);

    // Extract results
    const dbResult = databaseHealth.status === 'fulfilled' 
      ? databaseHealth.value 
      : { 
          status: 'unhealthy' as const, 
          error: 'Database check failed',
          responseTime: Date.now() - startTime 
        };

    const extResult = externalServices.status === 'fulfilled'
      ? externalServices.value
      : { 
          status: 'unhealthy' as const, 
          services: { openai: 'unhealthy' as const, stripe: 'unhealthy' as const } 
        };

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (dbResult.status === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (extResult.status === 'unhealthy') {
      overallStatus = 'degraded'; // External services down, but core system works
    } else if (extResult.status === 'degraded') {
      overallStatus = 'degraded';
    }

    const healthCheck: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        database: dbResult,
        environment: {
          status: 'healthy',
          nodeEnv: process.env.NODE_ENV || 'unknown',
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
        },
        externalServices: extResult,
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };

    // Return appropriate status code based on health
    const statusCode = overallStatus === 'healthy' ? 200 
                     : overallStatus === 'degraded' ? 200 
                     : 503;

    return NextResponse.json(healthCheck, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    
    const errorResponse: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: 'unhealthy',
          error: 'Health check failed',
        },
        environment: {
          status: 'unhealthy',
          nodeEnv: process.env.NODE_ENV || 'unknown',
          version: process.env.npm_package_version || '1.0.0',
          uptime: process.uptime(),
        },
        externalServices: {
          status: 'unhealthy',
          services: {
            openai: 'unknown',
            stripe: 'unknown',
          },
        },
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

// Also support HEAD requests for simple alive checks
export async function HEAD() {
  try {
    // During build time, return healthy status
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return new Response(null, { status: 200 });
    }

    const { getDatabaseHealth } = await getDatabaseUtils();
    const isHealthy = await getDatabaseHealth();
    return new Response(null, { status: isHealthy ? 200 : 503 });
  } catch {
    return new Response(null, { status: 503 });
  }
}