export const API_ROUTES = {
    createListing: "/api/create-listing"
}

export const TOKEN_DECIMALS = 18;
export const USDC_DECIMALS = 6;

export type ICreateListingRequest = {
    tokenAddress: string;
    // "1000000000000000000000000" = 1.00 (shifted right by TOKEN_DECIMALS)
    numberOfTokens: string;
    // "1000000" = 1.000000 USDC (shifted right by USDC_DECIMALS)
    pricePerToken: string;
    offerExpiresAt: number;
    termsDeliverables: string;
}

export interface IListing extends ICreateListingRequest {
    id: string;
    createdAt: number;
    attestedEscrowId: string;
}

export type ICreateListingResponse = {
    success: boolean;
    listing: IListing;
    error?: string;
}