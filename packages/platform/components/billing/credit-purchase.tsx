/**
 * Credit Purchase Component
 * Handles credit purchases via Stripe with real payment processing
 */

'use client';

import { useState } from 'react';
import { Plus, CreditCard, Loader2, ExternalLink, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { CryptoOnramp } from './crypto-onramp';

interface CreditPurchaseProps {
  currentBalance: number;
  organizationId: string;
}

export function CreditPurchase({ currentBalance, organizationId: _organizationId }: CreditPurchaseProps) {

  const [amount, setAmount] = useState(25);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'crypto'>('stripe');
  const [showCryptoOnramp, setShowCryptoOnramp] = useState(false);

  const predefinedAmounts = [10, 25, 50, 100, 250];

  const handlePurchase = async () => {
    if (paymentMethod === 'crypto') {
      handleCryptoPurchase();
      return;
    }

    setIsProcessing(true);

    try {
      // Create Stripe checkout session
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          currency: 'usd',
          successUrl: `${window.location.origin}/dashboard/billing?success=true`,
          cancelUrl: `${window.location.origin}/dashboard/billing?canceled=true`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();

      // Redirect to Stripe Checkout
      window.location.href = url;

    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed');
      setIsProcessing(false);
    }
  };

  const handleCryptoPurchase = () => {
    setShowCryptoOnramp(true);
  };

  const handleCryptoPaymentComplete = () => {
    setShowCryptoOnramp(false);
    toast.success('Crypto payment completed! Your credits will be added shortly.');
    // Refresh the page to show updated balance
    window.location.reload();
  };

  const handleCryptoCancel = () => {
    setShowCryptoOnramp(false);
  };

  return (
    <div className="bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6" data-testid="credit-purchase" id="credit-purchase">
      <div className="flex items-center mb-4">
        <Plus className="h-5 w-5 text-brand dark:text-brand-dark mr-2" />
        <h3 className="text-lg font-semibold text-typography-strong dark:text-typography-strong-dark" data-testid="purchase-title">
          Add Credits
        </h3>
      </div>

      <div className="space-y-6">
        {/* Current Balance Display */}
        <div className="bg-fill dark:bg-fill rounded-lg p-4">
          <p className="text-sm text-typography-weak dark:text-typography-weak-dark">Current Balance</p>
          <p className="text-2xl font-bold text-typography-strong dark:text-typography-strong-dark" data-testid="current-balance">
            ${currentBalance.toFixed(2)}
          </p>
        </div>

        {/* Amount Selection */}
        <div>
          <label className="block text-sm font-medium text-typography-strong dark:text-typography-strong-dark mb-3">
            Select Amount
          </label>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {predefinedAmounts.map((preset) => (
              <button
                key={preset}
                onClick={() => setAmount(preset)}
                className={`py-2 px-3 text-sm rounded-lg border transition-colors ${
                  amount === preset
                    ? 'bg-brand dark:bg-brand-dark text-white border-brand dark:border-brand-dark'
                    : 'bg-background dark:bg-background-dark text-typography-strong dark:text-typography-strong-dark border-stroke-weak dark:border-stroke-weak-dark hover:bg-background-hover dark:hover:bg-background-hover-dark'
                }`}
                data-testid={`amount-${preset}`}
              >
                ${preset}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div>
            <label className="block text-xs text-typography-weak dark:text-typography-weak-dark mb-1">Custom Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-typography-weak dark:text-typography-weak-dark">$</span>
              <input
                type="number"
                min="5"
                max="10000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full pl-8 pr-3 py-2 border border-stroke-weak dark:border-stroke-weak-dark bg-background dark:bg-background-dark text-typography-strong dark:text-typography-strong-dark rounded-lg focus:ring-2 focus:ring-brand focus:border-brand"
                data-testid="custom-amount-input"
              />
            </div>
            <p className="text-xs text-typography-weak dark:text-typography-weak-dark mt-1">
              Minimum $5, Maximum $10,000
            </p>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-medium text-typography-strong dark:text-typography-strong-dark mb-3">
            Payment Method
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="stripe"
                checked={paymentMethod === 'stripe'}
                onChange={(e) => setPaymentMethod(e.target.value as 'stripe')}
                className="mr-3"
                data-testid="payment-method-stripe"
              />
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="text-sm text-typography-strong dark:text-typography-strong-dark">Credit/Debit Card</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="crypto"
                checked={paymentMethod === 'crypto'}
                onChange={(e) => setPaymentMethod(e.target.value as 'crypto')}
                className="mr-3"
                data-testid="payment-method-crypto"
              />
              <Coins className="h-4 w-4 mr-2" />
              <span className="text-sm text-typography-strong dark:text-typography-strong-dark">Cryptocurrency</span>
            </label>
          </div>
        </div>

        {/* Payment Notice */}
        {paymentMethod === 'stripe' && (
          <div className="bg-secondary-fill dark:bg-secondary-fill border border-secondary-stroke-weak dark:border-secondary-stroke-weak rounded-lg p-4">
            <p className="text-sm text-secondary-typography-strong dark:text-secondary-typography-strong-dark">
              💳 Secure payment processing powered by Stripe
            </p>
            <p className="text-xs text-secondary-typography-weak dark:text-secondary-typography-weak-dark mt-1">
              You'll be redirected to Stripe Checkout to complete your payment
            </p>
          </div>
        )}

        {paymentMethod === 'crypto' && (
          <div className="bg-info-fill dark:bg-info-fill border border-info-stroke-weak dark:border-info-stroke-weak rounded-lg p-4">
            <p className="text-sm text-info dark:text-info">
              🪙 Cryptocurrency payment via Stripe Crypto Onramp
            </p>
            <p className="text-xs text-info-stroke-strong dark:text-info-stroke-strong mt-1">
              Pay with Bitcoin, Ethereum, USDC, or other supported cryptocurrencies
            </p>
          </div>
        )}

        {/* Purchase Summary */}
        <div className="bg-secondary-fill dark:bg-secondary-fill border border-secondary-stroke-weak dark:border-secondary-stroke-weak rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-secondary-typography-strong dark:text-secondary-typography-strong-dark">Credit Amount:</span>
            <span className="font-semibold text-secondary-typography-strong dark:text-secondary-typography-strong-dark" data-testid="purchase-amount">
              ${amount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-secondary-typography-strong dark:text-secondary-typography-strong-dark">New Balance:</span>
            <span className="font-semibold text-secondary-typography-strong dark:text-secondary-typography-strong-dark" data-testid="new-balance">
              ${(currentBalance + amount).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isProcessing || amount < 5}
          className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center"
          data-testid="purchase-button"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add ${amount} Credits
            </>
          )}
        </button>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-typography-weak dark:text-typography-weak-dark">
            🔒 Payments are securely processed by Stripe
          </p>
        </div>
      </div>

      {/* Crypto Onramp Modal */}
      {showCryptoOnramp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background dark:bg-background-dark rounded-lg max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <CryptoOnramp
              amount={amount}
              organizationId={_organizationId}
              onPaymentComplete={handleCryptoPaymentComplete}
              onCancel={handleCryptoCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
