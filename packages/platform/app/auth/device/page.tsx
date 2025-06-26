/**
 * Device Authorization Page
 * Where users complete device authorization flow
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface DeviceAuthData {
  user_code: string;
  device_code: string;
  client_id: string;
  scope: string;
  created_at: number;
  expires_at: number;
}

function DeviceAuthContent() {
  const [userCode, setUserCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const codeFromUrl = searchParams.get('user_code');
    if (codeFromUrl) {
      setUserCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get current authenticated user from session
      const userResponse = await fetch('/api/auth/identity', {
        method: 'GET',
        credentials: 'include',
      });

      if (!userResponse.ok) {
        // User not authenticated - redirect to login
        window.location.href = `/auth/login?redirect=${encodeURIComponent(window.location.href)}`;
        return;
      }

      const userData = await userResponse.json();
      
      if (!userData.success || !userData.data?.user) {
        setError('Unable to get user information. Please log in again.');
        return;
      }

      const user = userData.data.user;

      // Authorize device with real authenticated user
      const response = await fetch('/api/auth/device/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          user_code: userCode,
          authorize: true,
          user: {
            id: user.id,
            name: user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`.trim()
              : user.email.split('@')[0],
            email: user.email
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Authorization failed');
      }
    } catch (err) {
      setError('An error occurred during authorization');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authorization Successful!
          </h1>
          <p className="text-gray-600 mb-6">
            You can now close this window and return to your terminal.
          </p>
          <p className="text-sm text-gray-500">
            Your CLI should now be authenticated and ready to use.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Device Authorization
          </h1>
          <p className="text-gray-600">
            Authorize your ElizaOS CLI to access your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="user_code" className="block text-sm font-medium text-gray-700 mb-2">
              Enter the code from your terminal:
            </label>
            <input
              type="text"
              id="user_code"
              value={userCode}
              onChange={(e) => setUserCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-wider"
              pattern="[A-Z0-9]{4}-[A-Z0-9]{4}"
              maxLength={9}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || userCode.length !== 9}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-cy="authorize-device-button"
          >
            {isLoading ? 'Authorizing...' : 'Authorize Device'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            This will grant your CLI access to your ElizaOS account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DeviceAuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DeviceAuthContent />
    </Suspense>
  );
}