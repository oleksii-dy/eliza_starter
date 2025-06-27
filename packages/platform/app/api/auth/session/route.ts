import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function handleGET(request: NextRequest) {
  try {
    const authData = await auth();

    if (!authData) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: authData.user.id,
        email: authData.user.email,
        organizationId: authData.organizationId,
        role: authData.user.role || 'owner',
      },
    });
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
