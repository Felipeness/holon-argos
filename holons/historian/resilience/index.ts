export const HISTORIAN_RESILIENCE = {
  postmortem: {
    generationTimeoutMs: 120_000,
    maxRetries: 2,
  },
  graphQuery: {
    timeoutMs: 10_000,
    maxResults: 100,
  },
} as const
