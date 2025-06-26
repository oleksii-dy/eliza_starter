import * as Sentry from '@sentry/browser';

// Optional Sentry configuration
const SENTRY_DSN =
  (typeof process !== 'undefined' && process.env?.SENTRY_DSN) ||
  'https://bedb8e16c70b42c3e3cb69f0a5784da1@app.glitchtip.com/14775';

if (typeof process === 'undefined' || process.env?.SENTRY_LOGGING !== 'false') {
  // Only log when not explicitly disabled
  console.log('🛡️ Sentry instrumentation enabled');
}

const sentryEnvironment =
  (typeof process !== 'undefined'
    ? process.env?.SENTRY_ENVIRONMENT || process.env?.NODE_ENV
    : 'production') || 'development';

const sentryTraceRate =
  (typeof process !== 'undefined' && process.env?.SENTRY_TRACES_SAMPLE_RATE
    ? parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
    : 1.0) || 1.0;

const sentrySendPii =
  typeof process !== 'undefined' && process.env?.SENTRY_SEND_DEFAULT_PII === 'true';

if (typeof process === 'undefined' || process.env?.SENTRY_LOGGING !== 'false') {
  Sentry.onLoad(() => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: sentryEnvironment,
      tracesSampleRate: sentryTraceRate,
      sendDefaultPii: sentrySendPii,
    });
  });
}

export { Sentry };
