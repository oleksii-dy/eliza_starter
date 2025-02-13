import { TokenAuditor, AuditResult } from './audit';
import { IAgentRuntime } from '@elizaos/core';

let auditor: TokenAuditor | null = null;

export const initializeAuditor = (runtime: IAgentRuntime): void => {
  auditor = new TokenAuditor(runtime);
};

export const auditToken = async (symbol: string): Promise<AuditResult> => {
  if (!auditor) {
    throw new Error('Auditor not initialized. Call initializeAuditor first.');
  }
  return auditor.analyze(symbol);
};