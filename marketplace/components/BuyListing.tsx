import { useTwas } from '@/context/twas';
import { TOKEN_DECIMALS, USDC_DECIMALS } from '@/lib/api';
import BigNumber from 'bignumber.js';

const formatDecimals = (value: string, decimals: number): string => {
    try {
        const bn = new BigNumber(value);
        return bn.dividedBy(new BigNumber(10).pow(decimals)).toFormat(decimals === USDC_DECIMALS ? 6 : 2);
    } catch {
        return '0';
    }
};

const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
};

export const BuyListing = () => {
    const { listing } = useTwas();

    if (!listing) {
        return null;
    }

    const handleBuy = async () => {
        // TODO: Implement buy functionality
        console.log('Buy listing:', listing.id);
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Listing Details</h2>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Token Address</h3>
                        <p className="mt-1 text-base text-gray-900 font-mono break-all">
                            {listing.tokenAddress}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Listing ID</h3>
                        <p className="mt-1 text-base text-gray-900 font-mono break-all">
                            {listing.id}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Number of Tokens</h3>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                            {formatDecimals(listing.numberOfTokens, TOKEN_DECIMALS)}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Price per Token</h3>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                            {formatDecimals(listing.pricePerToken, USDC_DECIMALS)} USDC
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Total Price</h3>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                            {formatDecimals(
                                new BigNumber(listing.numberOfTokens)
                                    .multipliedBy(listing.pricePerToken)
                                    .dividedBy(new BigNumber(10).pow(TOKEN_DECIMALS))
                                    .toString(),
                                USDC_DECIMALS
                            )} USDC
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Offer Expires</h3>
                        <p className="mt-1 text-base text-gray-900">
                            {formatDate(listing.offerExpiresAt)}
                        </p>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Terms and Deliverables</h3>
                    <div className="bg-gray-50 rounded-md p-4">
                        <p className="text-base text-gray-900 whitespace-pre-wrap">
                            {listing.termsDeliverables}
                        </p>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-medium text-gray-500">Escrow Contract</h3>
                    <p className="mt-1 text-base text-gray-900 font-mono break-all">
                        {listing.attestedEscrowId}
                    </p>
                </div>

                <button
                    onClick={handleBuy}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                    Buy Now
                </button>
            </div>
        </div>
    );
};
