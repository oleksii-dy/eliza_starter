export interface EnvVarConfig {
  value?: string;
  type: 'api_key' | 'private_key' | 'public_key' | 'url' | 'credential' | 'config' | 'secret';
  required: boolean;
  description: string;
  canGenerate: boolean;
  validationMethod?: string;
  status: 'missing' | 'generating' | 'validating' | 'invalid' | 'valid';
  lastError?: string;
  attempts: number;
  createdAt?: number;
  validatedAt?: number;
  plugin: string;
}

export interface EnvVarMetadata {
  [pluginName: string]: {
    [varName: string]: EnvVarConfig;
  };
}

export interface GenerationScript {
  variableName: string;
  pluginName: string;
  script: string;
  dependencies: string[];
  attempts: number;
  output?: string;
  error?: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  createdAt: number;
}

export interface GenerationScriptMetadata {
  [scriptId: string]: GenerationScript;
}

export interface EnvVarUpdate {
  pluginName: string;
  variableName: string;
  value: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
}

// New types for multi-level secret management
export interface SecretConfig extends EnvVarConfig {
  level: 'global' | 'world' | 'user';
  ownerId?: string; // UUID as string
  worldId?: string; // UUID as string
  encrypted?: boolean;
  permissions?: SecretPermission[];
  sharedWith?: string[]; // UUIDs of entities with access
}

export interface SecretPermission {
  entityId: string; // UUID
  permissions: ('read' | 'write' | 'delete' | 'share')[];
  grantedBy: string; // UUID
  grantedAt: number;
  expiresAt?: number;
}

export interface SecretContext {
  level: 'global' | 'world' | 'user';
  worldId?: string; // UUID
  userId?: string; // UUID
  agentId: string; // UUID
  requesterId?: string; // UUID of entity making the request
}

export interface SecretMetadata {
  [key: string]: SecretConfig;
}

export interface SecretAccessLog {
  secretKey: string;
  entityId: string; // UUID of the entity that accessed
  action: string; // More flexible action type
  timestamp: number;
  context?: SecretContext;
  success: boolean;
  error?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

export interface EncryptedSecret {
  value: string; // encrypted value
  iv: string; // initialization vector
  authTag?: string; // for authenticated encryption
  algorithm: string;
  keyId: string; // reference to encryption key
}

// Plugin dependency validation types
export interface SecretRequirement {
  key: string;
  required: boolean;
  type: 'api_key' | 'private_key' | 'public_key' | 'url' | 'credential' | 'config' | 'secret';
  description: string;
  validationMethod?: string;
}

export interface SecretValidationResult {
  exists: boolean;
  valid: boolean;
  error?: string;
}

export interface DependencyValidationResult {
  pluginName: string;
  valid: boolean;
  validatedAt: number;
  requirements: SecretRequirement[];
  missing: SecretRequirement[];
  invalid: { requirement: SecretRequirement; error: string }[];
  warnings: string[];
  error?: string;
}

export interface PluginDependencyMap {
  [pluginName: string]: SecretRequirement[];
}

// Secret request and callback types
export interface SecretRequest {
  id: string;
  userId: string;
  secrets: { key: string; config: Partial<SecretConfig> }[];
  context: SecretContext;
  channel: CallbackChannel;
  status: SecretRequestStatus;
  createdAt: number;
  expiresAt: number;
  acceptedAt?: number;
  completedAt?: number;
  declinedAt?: number;
  expiredAt?: number;
  requireVerification: boolean;
  verificationMethods?: ('oauth' | 'wallet')[];
  portalUrl?: string;
  sessionId?: string;
  submissionData?: any;
  error?: string;
  metadata: {
    title: string;
    description: string;
    requestedBy: string;
    channel: Callback;
    [key: string]: any;
  };
}

export type SecretRequestStatus =
  | 'pending'
  | 'accepted'
  | 'completed'
  | 'declined'
  | 'expired'
  | 'failed';

export interface SecretRequestCallback {
  requestId: string;
  onSuccess?: (data: Record<string, any>) => Promise<void>;
  onFailure?: (error: string) => Promise<void>;
  onTimeout?: () => Promise<void>;
}

export type Callback = 'discord' | 'telegram' | 'slack' | 'memory' | 'webhook';

export interface CallbackChannel {
  type: Callback;
  roomId?: string; // UUID for platform channels
  userId?: string; // UUID for direct channels
  webhookUrl?: string; // For webhook notifications
  metadata?: Record<string, any>;
}

// Secret form types
export interface SecretFormRequest {
  secrets: { key: string; config: Partial<SecretConfig> }[];
  title?: string;
  description?: string;
  mode: 'requester' | 'inline';
  expiresIn?: number;
  maxSubmissions?: number;
  requireVerification?: boolean;
  verificationMethods?: ('oauth' | 'wallet')[];
  customFields?: FormField[];
}

export interface FormField {
  name: string;
  type: 'text' | 'password' | 'email' | 'url' | 'textarea' | 'select' | 'checkbox';
  label: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: string[]; // for select fields
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface FormSubmission {
  sessionId: string;
  data: Record<string, any>;
  submittedAt: number;
  verificationData?: {
    method: 'oauth' | 'wallet';
    profile: UserProfile | WalletProfile;
    verified: boolean;
  };
  metadata?: Record<string, any>;
}

// Verification types
export interface Challenge {
  id: string;
  userId: string;
  method: 'oauth' | 'wallet';
  provider?: string; // OAuth provider or wallet type
  challenge: string; // OAuth URL or signature message
  state?: string; // OAuth state or wallet nonce
  expiresAt: number;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  provider: string;
  username: string;
  email?: string;
  name?: string;
  avatar?: string;
  verified: boolean;
  metadata?: Record<string, any>;
}

export interface WalletProfile {
  address: string;
  chain: string;
  signature: string;
  message: string;
  verified: boolean;
  metadata?: Record<string, any>;
}

export interface WalletChallenge extends Challenge {
  method: 'wallet';
  walletAddress: string;
  chain: 'ethereum' | 'solana';
  message: string;
  nonce: string;
}
