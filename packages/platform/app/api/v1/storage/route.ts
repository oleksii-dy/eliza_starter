import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, authOptions } from '@/lib/auth/config';

export const runtime = 'nodejs';

// Mock files database - move this to a separate module if needed elsewhere
const filesDB: any[] = [];

export async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Filter files for the current organization
    const userFiles = filesDB.filter(
      (file) => file.organizationId === session.user.organizationId,
    );

    return NextResponse.json({
      success: true,
      files: userFiles,
      totalFiles: userFiles.length,
      totalSize: userFiles.reduce((sum, file) => sum + file.size, 0),
    });
  } catch (error: any) {
    console.error('Storage list error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list files',
        message: error.message || 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
