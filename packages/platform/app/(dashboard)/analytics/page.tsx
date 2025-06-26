'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChartIcon,
  CalendarIcon,
  TokensIcon,
  ActivityLogIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DotFilledIcon,
  DownloadIcon,
} from '@radix-ui/react-icons';
import Button from '@/components/ui/button';
import toast from '@/lib/toast';

interface AnalyticsData {
  totalRequests: number;
  totalSpent: number;
  totalTokens: number;
  averageRequestCost: number;
  topProviders: Array<{
    name: string;
    requests: number;
    spent: number;
    tokens: number;
    percentage: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    requests: number;
    spent: number;
    tokens: number;
  }>;
  requestsByModel: Array<{
    model: string;
    requests: number;
    spent: number;
    tokens: number;
  }>;
  trends: {
    requestsChange: number;
    spentChange: number;
    tokensChange: number;
  };
  // Additional fields for enhanced analytics
  totalBaseCost?: number;
  totalMarkup?: number;
  successRate?: number;
  averageLatency?: number;
}

interface MarkupConfig {
  markupPercentage: number;
}

type TimeRange = 'daily' | 'weekly' | 'monthly';

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [markupConfig, setMarkupConfig] = useState<MarkupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('daily');
  const [selectedMetric, setSelectedMetric] = useState<'requests' | 'spent' | 'tokens'>('requests');
  const [showMarkupModal, setShowMarkupModal] = useState(false);
  const [newMarkupPercentage, setNewMarkupPercentage] = useState('');

  const loadAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/analytics/overview?timeRange=${timeRange}`);
      const data = await response.json();

      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load analytics data');
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast({
        message: 'Failed to load analytics data',
        mode: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const loadMarkupConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/analytics/config');
      const data = await response.json();

      if (data.success) {
        setMarkupConfig(data.data);
        setNewMarkupPercentage(data.data.markupPercentage.toString());
      }
    } catch (error) {
      console.error('Failed to load markup config:', error);
    }
  }, []);

  const updateMarkupPercentage = async () => {
    try {
      const percentage = parseFloat(newMarkupPercentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        toast({
          message: 'Please enter a valid percentage between 0 and 100',
          mode: 'error',
        });
        return;
      }

      const response = await fetch('/api/analytics/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markupPercentage: percentage }),
      });

      const data = await response.json();

      if (data.success) {
        setMarkupConfig({ markupPercentage: percentage });
        setShowMarkupModal(false);
        toast({
          message: 'Markup percentage updated successfully',
          mode: 'success',
        });
        // Reload analytics data to reflect changes
        loadAnalyticsData();
      } else {
        throw new Error(data.error || 'Failed to update markup percentage');
      }
    } catch (error) {
      console.error('Failed to update markup percentage:', error);
      toast({
        message: 'Failed to update markup percentage',
        mode: 'error',
      });
    }
  };

  useEffect(() => {
    loadAnalyticsData();
    loadMarkupConfig();
  }, [loadAnalyticsData, loadMarkupConfig]);

  async function exportData() {
    try {
      const response = await fetch(`/api/analytics/export?timeRange=${timeRange}&format=csv`);
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        message: 'Analytics data exported successfully',
        mode: 'success',
      });
    } catch (error) {
      console.error('Failed to export data:', error);
      toast({
        message: 'Failed to export analytics data',
        mode: 'error',
      });
    }
  }

  function formatNumber(num: number): string {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }

  function formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  function getTrendIcon(change: number) {
    if (change > 0) {
      return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
    } else if (change < 0) {
      return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
    }
    return <DotFilledIcon className="h-4 w-4 text-gray-400" />;
  }

  function getTrendColor(change: number): string {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-400';
  }

  if (loading) {
    return <AnalyticsPageSkeleton />;
  }

  if (!analyticsData) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <BarChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load analytics data. Please try again later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600 mt-2">
            Monitor your AI inference usage, costs, and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg p-1" data-testid="time-range-selector">
            {(['daily', 'weekly', 'monthly'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>
          <Button handleClick={exportData} variant="secondary">
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Configuration Section */}
      {markupConfig && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pricing Configuration</h3>
              <p className="text-gray-600 mt-1">Current markup percentage: {markupConfig.markupPercentage}%</p>
            </div>
            <Button
              handleClick={() => setShowMarkupModal(true)}
              variant="secondary"
            >
              Configure Markup
            </Button>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        <MetricCard
          title="Total Requests"
          value={formatNumber(analyticsData.totalRequests)}
          change={analyticsData.trends.requestsChange}
          icon={<ActivityLogIcon className="h-6 w-6" />}
          color="text-blue-600"
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(analyticsData.totalSpent)}
          change={analyticsData.trends.spentChange}
          icon={<TokensIcon className="h-6 w-6" />}
          color="text-green-600"
          subtitle={analyticsData.totalBaseCost ? `Base: ${formatCurrency(analyticsData.totalBaseCost)}` : undefined}
        />
        <MetricCard
          title="Total Markup"
          value={formatCurrency(analyticsData.totalMarkup || 0)}
          change={0}
          icon={<BarChartIcon className="h-6 w-6" />}
          color="text-emerald-600"
          subtitle={markupConfig ? `@ ${markupConfig.markupPercentage}%` : undefined}
        />
        <MetricCard
          title="Total Tokens"
          value={formatNumber(analyticsData.totalTokens)}
          change={analyticsData.trends.tokensChange}
          icon={<BarChartIcon className="h-6 w-6" />}
          color="text-purple-600"
        />
        <MetricCard
          title="Success Rate"
          value={`${(analyticsData.successRate || 0).toFixed(1)}%`}
          change={0}
          icon={<CalendarIcon className="h-6 w-6" />}
          color="text-orange-600"
        />
        <MetricCard
          title="Avg Latency"
          value={`${(analyticsData.averageLatency || 0).toFixed(0)}ms`}
          change={0}
          icon={<CalendarIcon className="h-6 w-6" />}
          color="text-indigo-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Time Series Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Usage Over Time</h3>
            <div className="flex items-center space-x-2">
              {(['requests', 'spent', 'tokens'] as const).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                    selectedMetric === metric
                      ? 'bg-blue-100 text-blue-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div data-testid="time-series-chart">
            <TimeSeriesChart
              data={analyticsData.timeSeriesData}
              metric={selectedMetric}
              timeRange={timeRange}
            />
          </div>
        </div>

        {/* Provider Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Providers</h3>
          <div className="space-y-4">
            {analyticsData.topProviders.map((provider, index) => (
              <div key={provider.name} className="flex items-center space-x-3" data-testid="provider-item">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900" data-testid="provider-name">{provider.name}</span>
                    <span className="text-sm text-gray-600" data-testid="provider-percentage">{provider.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                      style={{ width: `${provider.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500" data-testid="provider-requests">
                      {formatNumber(provider.requests)} requests
                    </span>
                    <span className="text-xs text-gray-500" data-testid="provider-cost">
                      {formatCurrency(provider.spent)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Model</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Markup
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Cost/Token
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analyticsData.requestsByModel.map((model) => (
                <tr key={model.model} className="hover:bg-gray-50" data-testid="model-row">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {model.model}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(model.requests)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(model.tokens)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid="model-total-cost">
                    {formatCurrency(model.spent)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid="model-markup">
                    {markupConfig ? formatCurrency(model.spent * (markupConfig.markupPercentage / 120)) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {model.tokens > 0 ? `$${(model.spent / model.tokens * 1000).toFixed(4)}/1K` : '$0.00/1K'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Markup Configuration Modal */}
      {showMarkupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure Markup Percentage</h3>
            <p className="text-gray-600 mb-4">
              Set the markup percentage applied to all AI inference costs. This allows you to add
              your overhead and profit margin on top of the base provider costs.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Markup Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={newMarkupPercentage}
                onChange={(e) => setNewMarkupPercentage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="20.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a value between 0 and 100. For example, 20 means 20% markup.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowMarkupModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <Button handleClick={updateMarkupPercentage}>
                Update Markup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

function MetricCard({ title, value, change, icon, color, subtitle }: MetricCardProps) {
  const testId = title.toLowerCase().replace(/\s+/g, '-');
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6" data-testid="metric-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1" data-testid={testId}>{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== 0 && (
            <div className="flex items-center mt-1" data-testid="trend-indicator">
              <span className={`flex items-center text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {change > 0 ? <ArrowUpIcon className="h-3 w-3 mr-1" /> : <ArrowDownIcon className="h-3 w-3 mr-1" />}
                {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-gray-100 ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface TimeSeriesChartProps {
  data: AnalyticsData['timeSeriesData'];
  metric: 'requests' | 'spent' | 'tokens';
  timeRange: TimeRange;
}

function TimeSeriesChart({ data, metric, timeRange }: TimeSeriesChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No data available for the selected time range
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d[metric]));
  const formatValue = metric === 'spent' ? (v: number) => `$${v.toFixed(2)}` : (v: number) => v.toString();

  return (
    <div className="h-64 relative">
      <div className="absolute inset-0 flex items-end justify-between px-2 pb-8">
        {data.map((point, index) => {
          const height = maxValue > 0 ? (point[metric] / maxValue) * 100 : 0;
          return (
            <div key={point.date} className="flex flex-col items-center flex-1 max-w-16">
              <div
                className="w-8 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-sm transition-all hover:from-blue-600 hover:to-blue-400 cursor-pointer group relative"
                style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0px' }}
                title={`${formatValue(point[metric])} on ${point.date}`}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatValue(point[metric])}
                </div>
              </div>
              <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-center">
                {new Date(point.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnalyticsPageSkeleton() {
  return (
    <div className="p-6" data-testid="analytics-skeleton">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-20"></div>
        </div>
      </div>

      {/* Skeleton for metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton for charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton for table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}