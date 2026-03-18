export const HEALER_RESILIENCE = {
  remediation: {
    maxRetries: 2,
    stepTimeoutMs: 120_000,
    totalTimeoutMs: 600_000,
    circuitBreakerThreshold: 2,
  },
  verification: {
    checkIntervalMs: 10_000,
    maxChecks: 6,
    cooldownMs: 30_000,
  },
} as const
