import { vi } from 'vitest';

export class PhalaDeriveKeyProvider {
  deriveKey = vi.fn().mockReturnValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef');
} 