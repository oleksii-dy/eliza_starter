/**
 * Metrics API Route
 * Provides access to application metrics for monitoring dashboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { metrics } from '@/lib/monitoring/metrics';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const metric = url.searchParams.get('metric');
    const window = parseInt(url.searchParams.get('window') || '300000'); // 5 minute default
    const format = url.searchParams.get('format') || 'json';

    if (metric) {
      // Get specific metric with aggregations
      const aggregated = metrics.getAggregatedMetrics(metric, window);
      const raw = metrics.getMetrics(metric, Date.now() - window);

      return NextResponse.json({
        metric,
        window,
        aggregated,
        raw: raw.slice(-100), // Limit raw data to prevent large responses
        timestamp: new Date().toISOString(),
      });
    }

    // Get all metrics overview
    const allMetrics = metrics.getAllMetrics();
    const overview: Record<string, any> = {};

    // Create overview with recent aggregations
    for (const [name] of Object.entries(allMetrics)) {
      const aggregated = metrics.getAggregatedMetrics(name, window);
      if (aggregated.count > 0) {
        overview[name] = aggregated;
      }
    }

    if (format === 'prometheus') {
      // Export in Prometheus format for monitoring systems
      let prometheusData = '';

      for (const [name, data] of Object.entries(overview)) {
        prometheusData += `# HELP ${name} Application metric\n`;
        prometheusData += `# TYPE ${name} gauge\n`;
        prometheusData += `${name}_count ${data.count}\n`;
        prometheusData += `${name}_avg ${data.avg}\n`;
        prometheusData += `${name}_min ${data.min}\n`;
        prometheusData += `${name}_max ${data.max}\n`;
        prometheusData += `${name}_sum ${data.sum}\n`;
      }

      return new Response(prometheusData, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }

    return NextResponse.json({
      overview,
      window,
      timestamp: new Date().toISOString(),
      totalMetrics: Object.keys(allMetrics).length,
    });

  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

// Support HEAD requests for monitoring checks
export async function HEAD() {
  return new Response(null, { status: 200 });
}
