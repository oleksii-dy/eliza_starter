/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MODE: string
  readonly BASE_URL: string
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean
  
  // Custom environment variables
  readonly PORT?: string
  readonly WS_PORT?: string
  readonly WORLD?: string
  readonly SAVE_INTERVAL?: string
  readonly ENABLE_RPG?: string
  readonly JWT_SECRET?: string
  readonly ADMIN_CODE?: string
  readonly NODE_ENV?: string
  readonly VITEST?: string
  
  // LiveKit
  readonly LIVEKIT_URL?: string
  readonly LIVEKIT_WS_URL?: string
  readonly LIVEKIT_API_KEY?: string
  readonly LIVEKIT_API_SECRET?: string
  
  // Public variables
  readonly PUBLIC_API_URL?: string
  readonly PUBLIC_ASSETS_URL?: string
  readonly PUBLIC_MAX_UPLOAD_SIZE?: string
  
  // Hyperfy configuration
  readonly HYPERFY_ASSETS_URL?: string
  readonly HYPERFY_ASSETS_DIR?: string
  readonly HYPERFY_NETWORK_RATE?: string
  readonly HYPERFY_MAX_DELTA_TIME?: string
  readonly HYPERFY_FIXED_DELTA_TIME?: string
  readonly HYPERFY_LOG_LEVEL?: string
  readonly HYPERFY_PHYSICS_ENABLED?: string
  readonly HYPERFY_GRAVITY_X?: string
  readonly HYPERFY_GRAVITY_Y?: string
  readonly HYPERFY_GRAVITY_Z?: string
  
  // Build configuration
  readonly CLIENT_BUILD_DIR?: string
  readonly NO_CLIENT_SERVE?: string
  readonly COMMIT_HASH?: string
  
  // Allow any other environment variables
  [key: string]: string | boolean | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 