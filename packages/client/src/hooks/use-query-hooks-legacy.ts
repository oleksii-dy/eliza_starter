// This file contains legacy hooks that are being migrated to domain-specific hooks
// Keep this temporarily for backward compatibility during migration

import { apiClient } from '@/lib/api';
import type { Agent, Content, Memory, UUID, Memory as CoreMemory } from '@elizaos/core';
import {
  useQuery,
  useMutation,
  useQueryClient,
  useQueries,
  UseQueryResult,
  type DefinedUseQueryResult,
  type UndefinedInitialDataOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from './use-toast';
import { getEntityId, randomUUID, moment } from '@/lib/utils';
import type {
  ServerMessage,
  AgentWithStatus,
  MessageChannel as ClientMessageChannel,
  MessageServer as ClientMessageServer,
} from '@/types';
import clientLogger from '@/lib/logger';
import { useNavigate } from 'react-router-dom';

// Re-export STALE_TIMES from the new location
export { STALE_TIMES } from './constants';

// Mark all exports as deprecated
/** @deprecated Use useAgents from '@/hooks/agents' instead */
export const useAgents = () => {
  console.warn('useAgents from use-query-hooks is deprecated. Use useAgents from @/hooks/agents instead');
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => apiClient.getAgents(),
  });
};

// Add more legacy exports as needed during migration