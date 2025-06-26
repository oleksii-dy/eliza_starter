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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          <p className="text-typography-weak">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Simple Header */}
      <header className="flex items-center justify-between px-6 py-6 border-b border-stroke-weak">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-accent rounded"></div>
          <h1 className="text-xl font-semibold text-typography-strong">ElizaOS Platform</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Welcome Section */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-typography-strong mb-4">
              Welcome Back
            </h2>
            <p className="text-typography-weak">
              Sign in to access your ElizaOS Platform
            </p>
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
      <footer className="p-6 border-t border-stroke-weak">
        <div className="text-center">
          <p className="text-xs text-typography-weak">
            © 2024 ElizaOS Platform. All rights reserved.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <p className="text-xs text-typography-weak mt-1">
              Platform: {auth.platform} | 
              Auth: {auth.isAuthenticated ? 'Authenticated' : 'Not Authenticated'} |
              Version: {process.env.npm_package_version || '1.0.0'}
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}