/**
 * Platform Wrapper Component
 * Handles authentication state and embeds the Next.js platform
 */

import { useState, useEffect, useCallback } from 'react';
import { usePlatformAuth } from '../hooks/usePlatformAuth';
import { PlatformLoginForm } from './PlatformLoginForm';

export function PlatformWrapper() {
  const auth = usePlatformAuth();
  const [isServerAccessible, setIsServerAccessible] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Function to check if platform server is accessible
  const checkServerAccessibility = useCallback(async () => {
    try {
      const platformUrl = auth.getPlatformUrl();
      await fetch(platformUrl, {
        method: 'HEAD',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  }, [auth]);

  // Check server accessibility on mount and when auth state changes
  useEffect(() => {
    const checkServer = async () => {
      try {
        const isAccessible = await checkServerAccessibility();
        setIsServerAccessible(isAccessible);

        if (!isAccessible) {
          setServerError(
            'Platform server is not accessible. Please ensure the platform is running.'
          );
        } else {
          setServerError(null);
        }
      } catch {
        setServerError('Failed to connect to platform server.');
        setIsServerAccessible(false);
      }
    };

    checkServer();

    // Poll server accessibility every 5 seconds
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, [auth, checkServerAccessibility]);

  // Handle authentication success
  const handleAuthSuccess = () => {
    setShowLogin(false);
    // Server accessibility will be checked in the effect above
  };

  // Handle authentication error
  const handleAuthError = (error: string) => {
    console.error('Authentication error:', error);
  };

  // Show login form if not authenticated or explicitly requested
  if (!auth.isAuthenticated || showLogin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                borderRadius: '8px',
              }}
            ></div>
            <h1
              style={{
                margin: '0',
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
              }}
            >
              ElizaOS Platform
            </h1>
          </div>
          {auth.isAuthenticated && (
            <button
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '6px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setShowLogin(false)}
            >
              Back to Platform
            </button>
          )}
        </div>

        <div
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              maxWidth: '500px',
              width: '100%',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                color: 'white',
              }}
            >
              <h2
                style={{
                  margin: '0 0 12px 0',
                  fontSize: '32px',
                  fontWeight: '700',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                }}
              >
                {auth.isAuthenticated ? 'Authentication' : 'Welcome to ElizaOS Platform'}
              </h2>
              <p
                style={{
                  margin: '0',
                  fontSize: '16px',
                  opacity: '0.9',
                  lineHeight: '1.5',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
                }}
              >
                {auth.isAuthenticated
                  ? 'Manage your authentication settings'
                  : 'Sign in to access your AI agents and platform features'}
              </p>
            </div>

            <PlatformLoginForm onSuccess={handleAuthSuccess} onError={handleAuthError} />
          </div>
        </div>
      </div>
    );
  }

  // Show server error if platform is not accessible
  if (!isServerAccessible) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                borderRadius: '8px',
              }}
            ></div>
            <h1
              style={{
                margin: '0',
                fontSize: '20px',
                fontWeight: '700',
                color: 'white',
              }}
            >
              ElizaOS Platform
            </h1>
          </div>
          <button
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setShowLogin(true)}
          >
            Authentication
          </button>
        </div>

        <div
          style={{
            flex: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: 'white',
              maxWidth: '400px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                marginBottom: '16px',
              }}
            >
              ⚠️
            </div>
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '24px',
                fontWeight: '600',
              }}
            >
              Platform Not Available
            </h2>
            <p
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                opacity: '0.9',
              }}
            >
              {serverError || 'The ElizaOS platform server is not accessible.'}
            </p>
            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '14px',
                opacity: '0.7',
              }}
            >
              Please ensure the platform is running on {auth.getPlatformUrl()}
            </p>
            <button
              style={{
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => window.location.reload()}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated and server is accessible, show the platform in an iframe
  const platformUrl = auth.getPlatformUrl();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '28px',
              height: '28px',
              background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
              borderRadius: '6px',
            }}
          ></div>
          <h1
            style={{
              margin: '0',
              fontSize: '18px',
              fontWeight: '600',
              color: '#1e293b',
            }}
          >
            ElizaOS Platform
          </h1>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            {auth.user?.email}
          </span>
          <button
            style={{
              padding: '6px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white',
              color: '#475569',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => setShowLogin(true)}
          >
            Account
          </button>
          <button
            style={{
              padding: '6px 12px',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              background: 'white',
              color: '#dc2626',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => auth.signOut()}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div
        style={{
          flex: '1',
          position: 'relative',
        }}
      >
        <iframe
          src={platformUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            position: 'absolute',
            top: '0',
            left: '0',
          }}
          title="ElizaOS Platform"
        />
      </div>
    </div>
  );
}
