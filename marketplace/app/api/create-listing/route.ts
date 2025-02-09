import { NextResponse } from 'next/server';
import { ICreateListingRequest, ICreateListingResponse } from '@/lib/api';
import { createEscrow } from '@/lib/createEscrow';

export async function POST(request: Request) {
    console.log('create-listing');
    try {
        const data: ICreateListingRequest = await request.json();

        // Create escrow and get escrow ID
        const listing = await createEscrow(data);
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