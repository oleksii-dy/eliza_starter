import { NextRequest, NextResponse } from 'next/server';

// Use dynamic imports to avoid database connection during build
const getSessionService = () => import('@/lib/auth/session').then((m) => m.sessionService);
const getInferenceAnalytics = () => import('@/lib/services/inference-analytics').then((m) => m.inferenceAnalytics);

export async function GET(request: NextRequest) {
  try {
    // During build time, return a stub response to prevent database access
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json(
        { error: 'API not available during build time' },
        { status: 503 }
      );
    }

    const sessionService = await getSessionService();
    const session = await sessionService.getSessionFromCookies();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'daily';
    const provider = searchParams.get('provider') || undefined;
    const model = searchParams.get('model') || undefined;

    // Calculate date range based on timeRange
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // daily
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    // Get real analytics data
    const inferenceAnalytics = await getInferenceAnalytics();
    const analyticsData = await inferenceAnalytics.getAnalytics({
      organizationId: session.organizationId,
      startDate,
      endDate: now,
      provider,
      model,
    });

    // Transform the data to match the frontend interface
    const transformedData = {
      totalRequests: analyticsData.totalRequests,
      totalSpent: analyticsData.totalCost,
      totalTokens: analyticsData.totalTokens,
      averageRequestCost: analyticsData.totalRequests > 0 ? analyticsData.totalCost / analyticsData.totalRequests : 0,
      
      topProviders: analyticsData.byProvider.slice(0, 5).map(p => ({
        name: p.provider,
        requests: p.requests,
        spent: p.cost,
        tokens: p.tokens,
        percentage: p.percentage,
      })),
      
      timeSeriesData: analyticsData.byDay.map(d => ({
        date: d.date,
        requests: d.requests,
        spent: d.cost,
        tokens: d.tokens,
      })),
      
      requestsByModel: analyticsData.byModel.map(m => ({
        model: `${m.provider}/${m.model}`,
        requests: m.requests,
        spent: m.cost,
        tokens: m.tokens,
      })),
      
      trends: analyticsData.trends,
      
      // Additional analytics data
      totalBaseCost: analyticsData.totalBaseCost,
      totalMarkup: analyticsData.totalMarkup,
      successRate: analyticsData.successRate,
      averageLatency: analyticsData.averageLatency,
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('Failed to fetch analytics data:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics data',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

