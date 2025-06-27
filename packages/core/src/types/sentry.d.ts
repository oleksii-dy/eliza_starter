// Type shim for Sentry to fix missing types during declaration bundling
declare module '@sentry-internal/feedback/build/npm/types/core/types' {
  export interface OverrideFeedbackConfiguration {
    // Placeholder interface to satisfy type checking
    [key: string]: any;
  }
}
