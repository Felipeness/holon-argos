export const CIRCUIT_STATE = {
  CLOSED: "CLOSED",
  OPEN: "OPEN",
  HALF_OPEN: "HALF_OPEN",
} as const

export type CircuitState = (typeof CIRCUIT_STATE)[keyof typeof CIRCUIT_STATE]

export const FAILURE_TYPE = {
  TIMEOUT: "TIMEOUT",
  CONNECTION: "CONNECTION",
  RATE_LIMIT: "RATE_LIMIT",
  SERVER_ERROR: "SERVER_ERROR",
  VALIDATION: "VALIDATION",
} as const

export type FailureType = (typeof FAILURE_TYPE)[keyof typeof FAILURE_TYPE]

export interface CircuitBreakerConfig {
  readonly failureThreshold: number
  readonly resetTimeoutMs: number
  readonly halfOpenMaxAttempts: number
  readonly monitoredFailureTypes: readonly FailureType[]
  readonly bucketSizeMs: number
  readonly bucketCount: number
}

export const defaultConfig: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
  monitoredFailureTypes: [
    FAILURE_TYPE.TIMEOUT,
    FAILURE_TYPE.CONNECTION,
    FAILURE_TYPE.SERVER_ERROR,
  ],
  bucketSizeMs: 10_000,
  bucketCount: 6,
}

export interface FailureRecord {
  readonly type: FailureType
  readonly timestamp: number
}

export interface CircuitSnapshot {
  readonly state: CircuitState
  readonly failures: readonly FailureRecord[]
  readonly lastFailureAt: number | undefined
  readonly openedAt: number | undefined
  readonly halfOpenAttempts: number
}
