"use client"

import { useTwas } from '@/context/twas';
import { CHAIN, TOKEN_DECIMALS, USDC_DECIMALS } from '@/lib/api';
import BigNumber from 'bignumber.js';
import { useAccount } from 'wagmi'
import { buyTokens } from '@/lib/buyTokens';
import { useWalletClient } from 'wagmi'
import { config } from '@/config';
import { useTwasApi } from '@/hooks/useTwasApi';
import { IListing } from '@/lib/api';

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
    const { isConnected } = useAccount();
    const { isLoading, error } = useTwasApi();
    const { setListing, listing } = useTwas();
    const { data: client } = useWalletClient()

    if (!listing) return null

    const handleBuy = async () => {
        if (!isConnected) {
            return;
        }

        try {
            console.log("client", client)
            const updatedListing = await buyTokens(listing, client?.account!)
            setListing(updatedListing)
            // Handle success (e.g., show success message, refresh listing state)
            console.log('Purchase successful:', updatedListing)
        } catch (error) {
            // Handle error (e.g., show error message)
            console.error('Purchase failed:', error)
        }
    };


    if (listing?.purchaseTxHash) {
        return (
            <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-6 text-green-600">Purchase Confirmed! 🎉</h2>

                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                        <h3 className="font-semibold text-green-800 mb-2">Transaction Details</h3>
                        <div className="space-y-2 text-sm">
                            <p className="flex justify-between">
                                <span className="text-gray-600">Transaction Hash:</span>
                                <a
                                    href={`https://sepolia.basescan.org/tx/${listing.purchaseTxHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    {listing.purchaseTxHash.slice(0, 6)}...{listing.purchaseTxHash.slice(-4)}
                                </a>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-600">Purchase Time:</span>
                                <span className="text-gray-900">{new Date(listing.purchasedAt!).toLocaleString()}</span>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-600">Token Address:</span>
                                <a
                                    href={`https://sepolia.basescan.org/address/${listing.sellTokenAddress}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                >
                                    {listing.sellTokenAddress.slice(0, 6)}...{listing.sellTokenAddress.slice(-4)}
                                </a>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-600">Amount:</span>
                                <span className="text-gray-900">
                                    {formatDecimals(listing.sellTokenAmount, TOKEN_DECIMALS)} Tokens
                                </span>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-600">Total Cost:</span>
                                <span className="text-gray-900">
                                    {formatDecimals(listing.receiveTokenAmount, USDC_DECIMALS)} USDC
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Your tokens have been successfully purchased and transferred to your wallet.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Listing Details</h2>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Token Address</h3>
                        <p className="mt-1 text-base text-gray-900 font-mono break-all">
                            {listing.sellTokenAddress}
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
                            {formatDecimals(listing.sellTokenAmount, TOKEN_DECIMALS)}
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Price per Token</h3>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                            {formatDecimals(listing.sellTokenPrice, USDC_DECIMALS)} USDC
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Total Price</h3>
                        <p className="mt-1 text-xl font-semibold text-gray-900">
                            {formatDecimals(
                                listing.receiveTokenAmount,
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
                    <h3 className="text-sm font-medium text-gray-500">Escrow ID</h3>
                    <p className="mt-1 text-base text-gray-900 font-mono break-all">
                        {listing.attestedEscrowId}
                    </p>
                </div>

                <button
                    onClick={handleBuy}
                    disabled={!isConnected}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                    Buy Now
                </button>
            </div>
        </div>
    );
};
