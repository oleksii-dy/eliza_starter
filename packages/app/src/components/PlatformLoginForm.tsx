/**
 * Platform Login Form for Tauri Native App
 */

import { useState, useEffect } from 'react';
import { usePlatformAuth } from '../hooks/usePlatformAuth';

interface PlatformLoginFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function PlatformLoginForm({ onSuccess, onError }: PlatformLoginFormProps) {
  const auth = usePlatformAuth();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle successful authentication
  useEffect(() => {
    if (auth.isAuthenticated && !auth.isLoading) {
      onSuccess?.();
    }
  }, [auth.isAuthenticated, auth.isLoading, onSuccess]);

  // Handle auth errors
  useEffect(() => {
    if (auth.error) {
      setError(auth.error);
      setLoadingProvider(null);
      onError?.(auth.error);
    }
  }, [auth.error, onError]);

  const handleOAuthSignIn = async (providerId: string) => {
    try {
      setLoadingProvider(providerId);
      setError(null);

      const result = await auth.signInWithOAuth(providerId, {
        returnTo: '/dashboard',
      });

      if (!result.success) {
        setError(result.error || `Failed to sign in with ${providerId}`);
        setLoadingProvider(null);
      }
      // If successful, the OAuth flow will handle the redirect
    } catch (err) {
      console.error(`OAuth sign in failed for ${providerId}:`, err);
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setLoadingProvider(null);
    }
  };

  if (auth.isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        padding: '40px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid #e5e7eb',
            borderTop: '2px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <span style={{
            color: '#6b7280',
            fontSize: '14px'
          }}>Initializing...</span>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      padding: '40px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      maxWidth: '400px',
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: '600',
          color: '#111827'
        }}>Sign in to ElizaOS Platform</h2>
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: '#6b7280'
        }}>Choose your preferred sign-in method</p>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {auth.getOAuthProviders().map((provider) => (
          <button
            key={provider.id}
            onClick={() => handleOAuthSignIn(provider.id)}
            disabled={loadingProvider !== null}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              width: '100%',
              height: '48px',
              padding: '0 16px',
              border: `${loadingProvider === provider.id ? '2px' : '1px'} solid ${loadingProvider === provider.id ? provider.color : '#d1d5db'}`,
              borderRadius: '8px',
              background: 'white',
              color: loadingProvider === provider.id ? provider.color : '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loadingProvider !== null ? 0.7 : 1
            }}
          >
            {loadingProvider === provider.id ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #e5e7eb',
                  borderTop: `2px solid ${provider.color}`,
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <span>Connecting to {provider.name}...</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '18px' }}>{provider.icon}</span>
                <span>Continue with {provider.name}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '12px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px'
        }}>
          <p style={{
            margin: '0 0 8px 0',
            fontSize: '14px',
            color: '#dc2626'
          }}>{error}</p>
          <button
            onClick={() => setError(null)}
            style={{
              padding: '4px 8px',
              border: 'none',
              background: 'none',
              color: '#dc2626',
              fontSize: '12px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        textAlign: 'center'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 8px',
          background: '#dcfce7',
          color: '#166534',
          fontSize: '12px',
          fontWeight: '500',
          borderRadius: '9999px'
        }}>
          Desktop App
        </div>
        <span style={{
          fontSize: '12px',
          color: '#6b7280'
        }}>Native application with secure authentication</span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#6b7280',
          lineHeight: '1.4'
        }}>
          By signing in, you agree to our{' '}
          <a href="#" style={{
            color: '#3b82f6',
            textDecoration: 'none'
          }} onClick={(e) => {
            e.preventDefault();
            // TODO: Open terms in browser
          }}>
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" style={{
            color: '#3b82f6',
            textDecoration: 'none'
          }} onClick={(e) => {
            e.preventDefault();
            // TODO: Open privacy policy in browser
          }}>
            Privacy Policy
          </a>
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}