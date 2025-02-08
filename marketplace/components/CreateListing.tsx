import { useState } from 'react';
import { useTwasApi } from '@/hooks/useTwasApi';
import { ICreateListingRequest, TOKEN_DECIMALS, USDC_DECIMALS } from '@/lib/api';
import { useTwas } from '@/context/twas';
import BigNumber from 'bignumber.js';

const shiftDecimals = (value: string, decimals: number): string => {
    try {
        const bn = new BigNumber(value || '0');
        return bn.multipliedBy(new BigNumber(10).pow(decimals)).toString();
    } catch {
        return '0';
    }
};

export const CreateListing = () => {
    const { createListing, isLoading, error } = useTwasApi();
    const { setListing } = useTwas();
    const [formData, setFormData] = useState<ICreateListingRequest>({
        tokenAddress: '',
        numberOfTokens: '',
        pricePerToken: '',
        offerExpiresAt: 0,
        termsDeliverables: '',
    });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Add display values state for the form
    const [displayValues, setDisplayValues] = useState({
        numberOfTokens: '',
        pricePerToken: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage(null);

        // Convert display values to blockchain values
        const submissionData = {
            ...formData,
            numberOfTokens: shiftDecimals(displayValues.numberOfTokens, TOKEN_DECIMALS),
            pricePerToken: shiftDecimals(displayValues.pricePerToken, USDC_DECIMALS),
        };

        const result = await createListing(submissionData);
        if (result.success) {
            setSuccessMessage('Listing created successfully!');
            setListing(result.listing);
            setFormData({
                tokenAddress: '',
                numberOfTokens: '',
                pricePerToken: '',
                offerExpiresAt: 0,
                termsDeliverables: '',
            });
            setDisplayValues({
                numberOfTokens: '',
                pricePerToken: '',
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name === 'numberOfTokens' || name === 'pricePerToken') {
            // Update display values for numeric fields
            setDisplayValues(prev => ({
                ...prev,
                [name]: value,
            }));
        } else {
            // Update other form fields normally
            setFormData(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value).getTime();
        setFormData(prev => ({
            ...prev,
            offerExpiresAt: date
        }));
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Create New Listing</h2>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-600 rounded-md">
                    {successMessage}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="tokenAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        Token Address
                    </label>
                    <input
                        type="text"
                        id="tokenAddress"
                        name="tokenAddress"
                        value={formData.tokenAddress}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="numberOfTokens" className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Tokens
                        </label>
                        <input
                            type="text"
                            id="numberOfTokens"
                            name="numberOfTokens"
                            value={displayValues.numberOfTokens}
                            onChange={handleChange}
                            pattern="^\d*\.?\d*$"
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="pricePerToken" className="block text-sm font-medium text-gray-700 mb-1">
                            Price per Token (USDC)
                        </label>
                        <input
                            type="text"
                            id="pricePerToken"
                            name="pricePerToken"
                            value={displayValues.pricePerToken}
                            onChange={handleChange}
                            pattern="^\d*\.?\d*$"
                            placeholder="0.00"
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="offerExpiresAt" className="block text-sm font-medium text-gray-700 mb-1">
                        Offer Expiry Date
                    </label>
                    <input
                        type="datetime-local"
                        id="offerExpiresAt"
                        name="offerExpiresAt"
                        onChange={handleDateChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        required
                    />
                </div>

                <div>
                    <label htmlFor="termsDeliverables" className="block text-sm font-medium text-gray-700 mb-1">
                        Terms and Deliverables
                    </label>
                    <textarea
                        id="termsDeliverables"
                        name="termsDeliverables"
                        value={formData.termsDeliverables}
                        onChange={handleChange}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 px-4 rounded-md text-white font-medium
                        ${isLoading
                            ? 'bg-blue-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                        }`}
                >
                    {isLoading ? 'Creating...' : 'Create Listing'}
                </button>
            </form>
        </div>
    );
};
