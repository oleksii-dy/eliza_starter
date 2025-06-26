'use client';

import { useState, useEffect, Suspense } from 'react';
import {
  BarChart3,
  Receipt,
  Settings,
} from 'lucide-react';
import { CreditPurchase } from '@/components/billing/credit-purchase';
import { InvoiceHistory } from '@/components/billing/invoice-history';
import { BillingSettings } from '@/components/billing/billing-settings';

interface BillingData {
  creditBalance: number;
  monthlyUsage: number;
  monthlyPurchases: number;
  usageBreakdown: Record<string, number>;
  transactions: any[];
  organizationId: string;
}

export default function BillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const response = await fetch('/api/billing/overview');
        if (!response.ok) {
          throw new Error('Failed to fetch billing data');
        }
        const data = await response.json();
        setBillingData(data.data || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();
  }, []);

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'transactions', name: 'Transactions', icon: Receipt },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  if (loading) {
    return <BillingPageSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Billing & Credits</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage your credit balance, view transaction history, and configure billing settings
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">Error loading billing data: {error}</p>
        </div>
      </div>
    );
  }

  if (!billingData) {
    return <BillingPageSkeleton />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Billing Overview */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Account Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">${billingData.creditBalance.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Credit Balance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">${billingData.monthlyUsage.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Usage</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">${billingData.monthlyPurchases.toFixed(2)}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Purchases</div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Recent Transactions</h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {billingData.transactions.slice(0, 5).map((transaction: any, index: number) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{transaction.description}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(transaction.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className={`text-sm font-medium ${parseFloat(transaction.amount) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {parseFloat(transaction.amount) >= 0 ? '+' : ''}${parseFloat(transaction.amount).toFixed(2)}
                      </div>
                    </div>
                  ))}
                  {billingData.transactions.length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No transactions yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Credit Purchase */}
              <Suspense fallback={<CreditPurchaseSkeleton />}>
                <CreditPurchase
                  currentBalance={billingData.creditBalance}
                  organizationId={billingData.organizationId}
                />
              </Suspense>

              {/* Quick Stats */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6" data-testid="quick-stats">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">This Month Usage</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid="monthly-usage">
                      ${billingData.monthlyUsage.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">This Month Purchases</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid="monthly-purchases">
                      ${billingData.monthlyPurchases.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Subscription</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid="subscription-tier">
                      pay-as-you-go
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Breakdown */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6" data-testid="usage-breakdown">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Usage Breakdown</h3>
                <div className="space-y-3">
                  {Object.entries(billingData.usageBreakdown).map(([service, amount]) => (
                    <div key={service} className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{service}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        ${amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(billingData.usageBreakdown).length === 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No usage this month</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'transactions':
        return (
          <InvoiceHistory organizationId={billingData.organizationId} />
        );

      case 'settings':
        return (
          <BillingSettings 
            organizationId={billingData.organizationId}
            currentBalance={billingData.creditBalance}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8" data-testid="billing-dashboard">
      <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="billing-title">
          Billing & Credits
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400" data-testid="billing-subtitle">
          Manage your credit balance, view transaction history, and configure billing settings
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {renderTabContent()}
      </div>
    </div>
  );
}

function BillingPageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="border-b border-gray-200 pb-4">
        <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-96"></div>
      </div>
      
      {/* Tab skeleton */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded w-24"></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <CreditPurchaseSkeleton />
        </div>
      </div>
    </div>
  );
}

function CreditPurchaseSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  );
}