'use client';

import { ReactNode } from 'react';

interface ChartWidgetProps {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
}

export function ChartWidget({ 
  title, 
  children, 
  actions, 
  loading = false, 
  error, 
  className = '' 
}: ChartWidgetProps) {
  if (loading) {
    return (
      <div className={`bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-fill dark:bg-fill rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-fill dark:bg-fill rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-typography-strong dark:text-typography-strong-dark">{title}</h3>
          {actions}
        </div>
        <div className="h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-error dark:text-error-dark mb-2">⚠️</div>
            <p className="text-typography-weak dark:text-typography-weak-dark text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-typography-strong dark:text-typography-strong-dark">{title}</h3>
        {actions}
      </div>
      {children}
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: string;
  loading?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  changeLabel = 'vs last period',
  icon, 
  color = 'text-brand dark:text-brand-dark',
  loading = false 
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-fill dark:bg-fill rounded w-20 mb-2"></div>
          <div className="h-8 bg-fill dark:bg-fill rounded w-16 mb-1"></div>
          <div className="h-3 bg-fill dark:bg-fill rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background dark:bg-background-dark border border-stroke-weak dark:border-stroke-weak-dark rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-typography-weak dark:text-typography-weak-dark">{title}</p>
          <p className="text-2xl font-bold text-typography-strong dark:text-typography-strong-dark mt-1">{value}</p>
          {change !== undefined && (
            <div className="flex items-center mt-1">
              <span className={`flex items-center text-sm ${
                change > 0 ? 'text-success dark:text-success' : change < 0 ? 'text-error dark:text-error-dark' : 'text-typography-weak dark:text-typography-weak-dark'
              }`}>
                {change > 0 && '↗'}
                {change < 0 && '↘'}
                {change === 0 && '→'}
                <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
              </span>
              <span className="text-sm text-typography-weak dark:text-typography-weak-dark ml-1">{changeLabel}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg bg-fill dark:bg-fill ${color}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

interface SimpleBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  formatValue?: (value: number) => string;
}

export function SimpleBarChart({ 
  data, 
  height = 200, 
  formatValue = (v) => v.toString() 
}: SimpleBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center text-typography-weak dark:text-typography-weak-dark" style={{ height }}>
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));

  return (
    <div className="relative" style={{ height }}>
      <div className="absolute inset-0 flex items-end justify-between px-2 pb-8">
        {data.map((point, index) => {
          const barHeight = maxValue > 0 ? (point.value / maxValue) * 100 : 0;
          const color = point.color || 'bg-brand dark:bg-brand-dark';
          
          return (
            <div key={index} className="flex flex-col items-center flex-1 max-w-16">
              <div
                className={`w-8 ${color} rounded-t-sm transition-all hover:opacity-80 cursor-pointer group relative`}
                style={{ height: `${barHeight}%`, minHeight: barHeight > 0 ? '4px' : '0px' }}
                title={`${formatValue(point.value)}`}
              >
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-typography-strong dark:bg-typography-strong-dark text-background dark:text-background-dark text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {formatValue(point.value)}
                </div>
              </div>
              <span className="text-xs text-typography-weak dark:text-typography-weak-dark mt-2 transform -rotate-45 origin-center">
                {point.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ 
  value, 
  max, 
  label, 
  color = 'bg-brand dark:bg-brand-dark',
  showPercentage = true 
}: ProgressBarProps) {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between mb-1">
          <span className="text-sm font-medium text-typography-strong dark:text-typography-strong-dark">{label}</span>
          {showPercentage && (
            <span className="text-sm text-typography-weak dark:text-typography-weak-dark">{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-fill dark:bg-fill rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}