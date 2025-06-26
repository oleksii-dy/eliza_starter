/**
 * React hook for platform authentication
 */

import { useState, useEffect, useCallback } from 'react';
import { platformAuth, type AuthState, type OAuthProvider, type OAuthResult } from '../lib/platform-auth';

export interface UsePlatformAuthReturn extends AuthState {
  signInWithOAuth: (providerId: string, options?: { returnTo?: string; sessionId?: string }) => Promise<OAuthResult>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getOAuthProviders: () => OAuthProvider[];
  getPlatformUrl: () => string;
  waitForInit: () => Promise<void>;
}

export function usePlatformAuth(): UsePlatformAuthReturn {
  const [authState, setAuthState] = useState<AuthState>(platformAuth.getState());

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = platformAuth.subscribe(setAuthState);
    
    // Initialize auth service if not already done
    platformAuth.waitForInit().catch(error => {
      console.error('Platform auth initialization failed:', error);
    });

    return unsubscribe;
  }, []);

  const signInWithOAuth = useCallback(async (
    providerId: string, 
    options?: { returnTo?: string; sessionId?: string }
  ): Promise<OAuthResult> => {
    return platformAuth.startOAuthFlow(providerId, options);
  }, []);

  const signOut = useCallback(async () => {
    return platformAuth.signOut();
  }, []);

  const refreshToken = useCallback(async () => {
    return platformAuth.refreshToken();
  }, []);

  const getOAuthProviders = useCallback(() => {
    return platformAuth.getOAuthProviders();
  }, []);

  const getPlatformUrl = useCallback(() => {
    return platformAuth.getPlatformUrl();
  }, []);

  const waitForInit = useCallback(async () => {
    return platformAuth.waitForInit();
  }, []);

  return {
    ...authState,
    signInWithOAuth,
    signOut,
    refreshToken,
    getOAuthProviders,
    getPlatformUrl,
    waitForInit,
  };
}