'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  RocketIcon,
  TokensIcon,
  BarChartIcon,
  PlusIcon,
  PersonIcon,
  GearIcon as _GearIcon,
  ActivityLogIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
  ClockIcon,
  ArrowRightIcon,
} from '@radix-ui/react-icons';
import toast from '@/lib/toast';
import { getResponseMessage } from '@/messages';
import Button from '@/components/ui/button';

interface DashboardStats {
  agentCount: number;
  userCount: number;
  creditBalance: string;
  subscriptionTier: string;
  apiRequests24h: number;
  totalCost24h: string;
  activeAgents: number;
  pendingInvites: number;
}

interface RecentActivity {
  id: string;
  type: 'agent_created' | 'agent_deployed' | 'user_invited' | 'api_key_created' | 'credit_added';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  isNew?: boolean;
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'agent_deployed':
      return <CheckCircledIcon className="h-4 w-4" />;
    case 'agent_created':
      return <RocketIcon className="h-4 w-4" />;
    case 'agent_stopped':
      return <ClockIcon className="h-4 w-4" />;
    case 'user_invited':
    case 'user_joined':
      return <PersonIcon className="h-4 w-4" />;
    case 'api_key_created':
      return <ActivityLogIcon className="h-4 w-4" />;
    case 'credit_added':
      return <TokensIcon className="h-4 w-4" />;
    default:
      return <ActivityLogIcon className="h-4 w-4" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'agent_deployed':
      return 'text-green-600';
    case 'agent_created':
      return 'text-blue-600';
    case 'agent_stopped':
      return 'text-gray-600';
    case 'user_invited':
    case 'user_joined':
      return 'text-indigo-600';
    case 'api_key_created':
      return 'text-orange-600';
    case 'credit_added':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

function DashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const message = searchParams ? searchParams.get('message') || '' : '';
  const errorMessage = searchParams ? searchParams.get('error') || '' : '';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle URL messages
  useEffect(() => {
    if (message) {
      toast({
        message: getResponseMessage(message),
        mode: 'success',
      });

      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('message');

      router.replace(
        `${pathname}${
          newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''
        }`,
        { scroll: false }
      );
    } else if (errorMessage) {
      toast({
        message: getResponseMessage(errorMessage),
        mode: 'error',
      });

      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.delete('error');

      router.replace(
        `${pathname}${
          newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''
        }`,
        { scroll: false }
      );
    }
  }, [errorMessage, message, router, searchParams, pathname]);

  // Load dashboard data
  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch real dashboard statistics
        const statsResponse = await fetch('/api/dashboard/stats', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!statsResponse.ok) {
          throw new Error(`Failed to fetch stats: ${statsResponse.status}`);
        }

        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(statsData.data);
        } else {
          throw new Error(statsData.error || 'Failed to load stats');
        }

        // Fetch real dashboard activity
        const activityResponse = await fetch('/api/dashboard/activity?limit=4', {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!activityResponse.ok) {
          throw new Error(`Failed to fetch activity: ${activityResponse.status}`);
        }

        const activityData = await activityResponse.json();
        if (activityData.success) {
          // Map activity data to include icons and colors
          const mappedActivity = activityData.data.map((activity: any) => ({
            ...activity,
            icon: getActivityIcon(activity.type),
            color: getActivityColor(activity.type),
          }));
          setRecentActivity(mappedActivity);
        } else {
          console.warn('Failed to load activity:', activityData.error);
          setRecentActivity([]); // Set empty array if activity fails
        }
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        toast({
          message: 'Failed to load dashboard data',
          mode: 'error',
        });
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  const quickActions: QuickAction[] = [
    {
      id: 'create-agent',
      title: 'Create Agent',
      description: 'Build a new AI agent with our visual editor',
      href: '/dashboard/agents/create',
      icon: <PlusIcon className="h-5 w-5" />,
      color: 'bg-blue-500 hover:bg-blue-600',
      isNew: true,
    },
    {
      id: 'manage-api-keys',
      title: 'Manage API Keys',
      description: 'Create and manage your API keys',
      href: '/dashboard/api-keys',
      icon: <TokensIcon className="h-5 w-5" />,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      id: 'view-usage',
      title: 'View Billing',
      description: 'Monitor your usage and billing',
      href: '/dashboard/billing',
      icon: <BarChartIcon className="h-5 w-5" />,
      color: 'bg-green-500 hover:bg-green-600',
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8" data-cy="dashboard-header">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening with your agents and organization.
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-cy="stats-section">
          <div className="bg-white rounded-lg border border-gray-200 p-6" data-cy="stats-agents">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Agents</p>
                <p className="text-2xl font-bold text-gray-900" data-cy="agent-count">{stats.agentCount}</p>
                <p className="text-xs text-gray-500" data-cy="active-agents">{stats.activeAgents} active</p>
              </div>
              <RocketIcon className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6" data-cy="stats-team">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Team Members</p>
                <p className="text-2xl font-bold text-gray-900" data-cy="user-count">{stats.userCount}</p>
                <p className="text-xs text-gray-500" data-cy="pending-invites">{stats.pendingInvites} pending invites</p>
              </div>
              <PersonIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6" data-cy="stats-credits">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Credit Balance</p>
                <p className="text-2xl font-bold text-gray-900" data-cy="credit-balance">${stats.creditBalance}</p>
                <p className="text-xs text-gray-500" data-cy="subscription-tier">{stats.subscriptionTier} plan</p>
              </div>
              <TokensIcon className="h-8 w-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6" data-cy="stats-api">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">API Requests (24h)</p>
                <p className="text-2xl font-bold text-gray-900" data-cy="api-requests">{stats.apiRequests24h.toLocaleString()}</p>
                <p className="text-xs text-gray-500" data-cy="api-cost">${stats.totalCost24h} cost</p>
              </div>
              <BarChartIcon className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-cy="quick-actions">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                className="group relative rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                data-cy={`quick-action-${action.id}`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg text-white ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                        {action.title}
                      </h3>
                      {action.isNew && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                  </div>
                </div>
                <ArrowRightIcon className="absolute top-4 right-4 h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6" data-cy="recent-activity">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Link
              href="/dashboard/analytics"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4" data-cy="activity-list">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3" data-cy={`activity-item-${activity.type}`}>
                <div className={`p-1.5 rounded-full bg-gray-100 ${activity.color}`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900" data-cy="activity-title">{activity.title}</p>
                  <p className="text-xs text-gray-500" data-cy="activity-description">{activity.description}</p>
                  <p className="text-xs text-gray-400 mt-1" data-cy="activity-timestamp">{activity.timestamp}</p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <div className="text-center py-8">
                <ClockIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low Credit Warning */}
      {stats && parseFloat(stats.creditBalance) < 10 && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Low Credit Balance
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your credit balance is running low. Add credits to avoid service interruption.
              </p>
              <div className="mt-3">
                <Button
                  href="/settings/billing"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm px-4 py-2"
                >
                  Add Credits
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
