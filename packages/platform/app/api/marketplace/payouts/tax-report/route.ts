import { NextRequest, NextResponse } from 'next/server';
import { RevenueSharing } from '@/lib/services/revenue-sharing';
import { auth } from '@/lib/auth';

const revenueService = new RevenueSharing();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    
    let year = new Date().getFullYear();
    
    if (yearParam) {
      year = parseInt(yearParam);
      if (isNaN(year) || year < 2020 || year > new Date().getFullYear()) {
        return NextResponse.json(
          { error: 'Invalid year. Must be between 2020 and current year.' },
          { status: 400 }
        );
      }
    }

    // Generate tax report
    const taxReport = await revenueService.generateTaxReport(
      session.user.id,
      session.organizationId,
      year
    );

    return NextResponse.json({
      success: true,
      data: {
        year,
        ...taxReport,
        generatedAt: new Date().toISOString()
      },
    });
  } catch (error) {
    console.error('Failed to generate tax report:', error);
    return NextResponse.json(
      { error: 'Failed to generate tax report' },
      { status: 500 }
    );
  }
}