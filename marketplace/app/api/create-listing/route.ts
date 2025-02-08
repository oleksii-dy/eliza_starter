import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ICreateListingRequest, ICreateListingResponse } from '@/lib/api';

export async function POST(request: Request) {
    try {
        const data: ICreateListingRequest = await request.json();

        // Create listing with generated IDs
        const listing = {
            ...data,
            id: uuidv4(),
            attestedEscrowId: uuidv4(),
            createdAt: Date.now(),
        };

        // TODO: Save listing to database

        const response: ICreateListingResponse = {
            success: true,
            listing,
        };

        return NextResponse.json(response);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create listing';
        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
            } as ICreateListingResponse,
            { status: 500 }
        );
    }
}