export const COORDINATOR_RESILIENCE = {
  sagaExecution: {
    maxRetries: 3,
    totalTimeoutMs: 1_800_000,
    escalationTimeoutMs: 300_000,
  },
  notifications: {
    maxRetries: 5,
    retryDelayMs: 2_000,
    circuitBreakerThreshold: 5,
  },
} as const
