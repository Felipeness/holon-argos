export const DIAGNOSTICIAN_RESILIENCE = {
  diagnosis: {
    maxRetries: 2,
    timeoutMs: 60_000,
    circuitBreakerThreshold: 3,
  },
  llmCalls: {
    maxRetries: 3,
    timeoutMs: 30_000,
    rateLimitPerMinute: 60,
  },
} as const
