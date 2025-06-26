/**
 * Billing Overview Component
 * Displays current credit balance and key billing metrics
 */

'use client';

import { useState } from 'react';
import { CreditCard, TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface BillingOverviewProps {
  overview: {
    creditBalance: number;
    monthlyUsage: number;
    monthlyPurchases: number;
    usageBreakdown: Record<string, number>;
    subscriptionTier: string;
    nextBillingDate?: string | null;
  };
  organizationId: string;
}

export function BillingOverview({ overview }: BillingOverviewProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Refresh the page to get latest data
    window.location.reload();
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 50) {return 'text-success dark:text-success';}
    if (balance > 20) {return 'text-warning dark:text-warning';}
    return 'text-error dark:text-error-dark';
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 50) {return '✅';}
    if (balance > 20) {return '⚠️';}
    return '🔴';
  };

  return (
    <div className="bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6" data-testid="billing-overview">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-typography-strong dark:text-typography-strong-dark" data-testid="overview-title">
          Account Overview
        </h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="text-sm text-brand dark:text-brand-dark hover:opacity-80 disabled:opacity-50"
          data-testid="refresh-billing"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Credit Balance - Featured */}
      <div className="bg-secondary-fill dark:bg-secondary-fill border border-secondary-stroke-weak dark:border-secondary-stroke-weak rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-typography-strong dark:text-secondary-typography-strong-dark">Current Credit Balance</p>
            <div className="flex items-center mt-1">
              <span className="text-3xl font-bold text-secondary-typography-strong dark:text-secondary-typography-strong-dark" data-testid="credit-balance">
                ${overview.creditBalance.toFixed(2)}
              </span>
              <span className="ml-2 text-lg" data-testid="balance-indicator">
                {getBalanceIcon(overview.creditBalance)}
              </span>
            </div>
            <p className={`text-sm mt-1 ${getBalanceColor(overview.creditBalance)}`} data-testid="balance-status">
              {overview.creditBalance > 50
                ? 'Healthy balance'
                : overview.creditBalance > 20
                  ? 'Consider adding credits soon'
                  : 'Low balance - add credits now'}
            </p>
          </div>
          <CreditCard className="h-12 w-12 text-secondary-typography-strong dark:text-secondary-typography-strong-dark" />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="metrics-grid">
        {/* Monthly Usage */}
        <div className="bg-fill dark:bg-fill rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-error dark:text-error-dark mr-3" />
            <div>
              <p className="text-sm font-medium text-typography-strong dark:text-typography-strong-dark">This Month Usage</p>
              <p className="text-2xl font-bold text-typography-strong dark:text-typography-strong-dark" data-testid="monthly-usage-amount">
                ${overview.monthlyUsage.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Monthly Purchases */}
        <div className="bg-fill dark:bg-fill rounded-lg p-4">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-success dark:text-success mr-3" />
            <div>
              <p className="text-sm font-medium text-typography-strong dark:text-typography-strong-dark">This Month Purchases</p>
              <p className="text-2xl font-bold text-typography-strong dark:text-typography-strong-dark" data-testid="monthly-purchases-amount">
                ${overview.monthlyPurchases.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Tier */}
        <div className="bg-fill dark:bg-fill rounded-lg p-4">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-brand dark:text-brand-dark mr-3" />
            <div>
              <p className="text-sm font-medium text-typography-strong dark:text-typography-strong-dark">Subscription</p>
              <p className="text-lg font-bold text-typography-strong dark:text-typography-strong-dark capitalize" data-testid="subscription-display">
                {overview.subscriptionTier.replace('-', ' ')}
              </p>
              {overview.nextBillingDate && (
                <p className="text-xs text-typography-weak dark:text-typography-weak-dark" data-testid="next-billing-date">
                  Next: {new Date(overview.nextBillingDate).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Low Balance Warning */}
      {overview.creditBalance < 20 && (
        <div className="mt-6 bg-warning-fill dark:bg-warning-fill border border-warning-stroke-weak dark:border-warning-stroke-weak rounded-lg p-4" data-testid="low-balance-warning">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-warning dark:text-warning text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-warning-stroke-strong dark:text-warning-stroke-strong">
                Low Credit Balance
              </h3>
              <p className="text-sm text-warning dark:text-warning mt-1">
                Your credit balance is running low. Consider adding more credits to avoid service interruptions.
              </p>
            </div>
            <div className="ml-auto">
              <a
                href="#credit-purchase"
                className="text-sm font-medium text-warning-stroke-strong dark:text-warning-stroke-strong hover:opacity-80"
                data-testid="add-credits-link"
              >
                Add Credits →
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Critical Balance Alert */}
      {overview.creditBalance < 5 && (
        <div className="mt-4 bg-error-fill dark:bg-error-fill border border-error-stroke-weak dark:border-error-stroke-weak rounded-lg p-4" data-testid="critical-balance-alert">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-error dark:text-error-dark text-xl">🚨</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-error-stroke-strong dark:text-error-stroke-strong">
                Critical: Very Low Balance
              </h3>
              <p className="text-sm text-error dark:text-error-dark mt-1">
                Your balance is critically low. Add credits immediately to prevent service suspension.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
