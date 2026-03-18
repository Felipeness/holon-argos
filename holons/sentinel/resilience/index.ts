// Resilience configuration for sentinel holon
export const SENTINEL_RESILIENCE = {
  alertIngestion: {
    maxRetries: 3,
    retryDelayMs: 1_000,
    circuitBreakerThreshold: 10,
    rateLimitPerSecond: 100,
  },
  deduplication: {
    windowMs: 300_000,
    maxFingerprints: 10_000,
  },
} as const
