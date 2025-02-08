import { useState } from 'react';
import { API_ROUTES, ICreateListingRequest, ICreateListingResponse, IListing } from '@/lib/api';

export const useTwasApi = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createListing = async (data: ICreateListingRequest): Promise<ICreateListingResponse> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(API_ROUTES.createListing, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create listing');
            }

            return {
                success: true,
                listing: result.listing,
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An error occurred';
            setError(errorMessage);
            return {
                success: false,
                listing: {} as IListing,
                error: errorMessage,
            };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        createListing,
        isLoading,
        error,
    };
};
