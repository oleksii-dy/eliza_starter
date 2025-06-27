'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedLoginForm } from '@/components/auth/UnifiedLoginForm';
import { useUnifiedAuth } from '@/src/hooks/useUnifiedAuth';
import { ThemeToggle } from '@/components/theme/theme-switcher';

export default function AppLander() {
  const router = useRouter();
  const auth = useUnifiedAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait for auth initialization
    auth.waitForInit().then(() => {
      setIsLoading(false);

      // If already authenticated, redirect to dashboard
      if (auth.isAuthenticated) {
        router.push('/dashboard');
      }
    });
  }, [auth, router]);

  const handleLoginSuccess = () => {
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-accent"></div>
          <p className="text-typography-weak">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Simple Header */}
      <header className="flex items-center justify-between border-b border-stroke-weak px-6 py-6">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded bg-accent"></div>
          <h1 className="text-xl font-semibold text-typography-strong">
            ElizaOS Platform
          </h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-3xl font-bold text-typography-strong">
              Get the App
            </h2>
            <p className="text-typography-weak">
              Download ElizaOS Platform for your device
            </p>
          </div>

          {/* App Download Section */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col gap-3">
              <button
                data-cy="download-app"
                className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
              >
                Download App
              </button>
              <button
                data-cy="install-app"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Install from Web
              </button>
            </div>

            {/* Platform-specific downloads */}
            <div className="grid grid-cols-2 gap-2">
              <button
                data-cy="download-ios"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                iOS
              </button>
              <button
                data-cy="download-android"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Android
              </button>
              <button
                data-cy="download-windows"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Windows
              </button>
              <button
                data-cy="download-mac"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                macOS
              </button>
            </div>
          </div>

          {/* App Features */}
          <div className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-typography-strong">
              Features
            </h3>
            <ul className="space-y-2 text-sm text-typography-weak">
              <li>• Native Mobile experience</li>
              <li>• Desktop integration</li>
              <li>• Offline capabilities</li>
              <li>• Push notifications</li>
            </ul>
          </div>

          {/* Login Form */}
          <UnifiedLoginForm
            onSuccess={handleLoginSuccess}
            returnTo="/dashboard"
          />

          {/* Platform info is now handled by UnifiedLoginForm */}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stroke-weak p-6">
        <div className="text-center">
          <p className="text-xs text-typography-weak">
            © 2024 ElizaOS Platform. All rights reserved.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="mt-1 text-xs text-typography-weak">
              Platform: {auth.platform} | Auth:{' '}
              {auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'} |
              Version: {process.env.npm_package_version || '1.0.0'}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
