import { Effect, Ref } from "effect"
import { CircuitOpen } from "@argos/shared"
import {
  CIRCUIT_STATE,
  type CircuitBreakerConfig,
  type CircuitSnapshot,
  type CircuitState,
  type FailureRecord,
  type FailureType,
  defaultConfig,
} from "./types.js"

interface MutableState {
  state: CircuitState
  failures: FailureRecord[]
  lastFailureAt: number | undefined
  openedAt: number | undefined
  halfOpenAttempts: number
}

export interface CircuitBreaker {
  readonly execute: <A, E>(
    effect: Effect.Effect<A, E>,
    failureType?: FailureType,
  ) => Effect.Effect<A, E | CircuitOpen>
  readonly recordFailure: (type: FailureType) => Effect.Effect<void>
  readonly recordSuccess: () => Effect.Effect<void>
  readonly snapshot: () => Effect.Effect<CircuitSnapshot>
  readonly reset: () => Effect.Effect<void>
}

const pruneOldFailures = (
  failures: FailureRecord[],
  config: CircuitBreakerConfig,
  now: number,
): FailureRecord[] => {
  const windowMs = config.bucketSizeMs * config.bucketCount
  return failures.filter((f) => now - f.timestamp < windowMs)
}

const countRelevantFailures = (
  failures: readonly FailureRecord[],
  monitoredTypes: readonly FailureType[],
): number => failures.filter((f) => monitoredTypes.includes(f.type)).length

export const makeCircuitBreaker = (
  service: string,
  config: Partial<CircuitBreakerConfig> = {},
): Effect.Effect<CircuitBreaker> => {
  const cfg: CircuitBreakerConfig = { ...defaultConfig, ...config }

  return Effect.gen(function* () {
    const stateRef = yield* Ref.make<MutableState>({
      state: CIRCUIT_STATE.CLOSED,
      failures: [],
      lastFailureAt: undefined,
      openedAt: undefined,
      halfOpenAttempts: 0,
    })

    const evaluateState = (s: MutableState, now: number): MutableState => {
      if (s.state === CIRCUIT_STATE.OPEN && s.openedAt !== undefined) {
        if (now - s.openedAt >= cfg.resetTimeoutMs) {
          return { ...s, state: CIRCUIT_STATE.HALF_OPEN, halfOpenAttempts: 0 }
        }
      }
      return s
    }

    const recordFailure = (type: FailureType): Effect.Effect<void> =>
      Ref.update(stateRef, (s) => {
        const now = Date.now()
        const failures = pruneOldFailures([...s.failures, { type, timestamp: now }], cfg, now)
        const relevant = countRelevantFailures(failures, cfg.monitoredFailureTypes)

        if (s.state === CIRCUIT_STATE.HALF_OPEN) {
          return {
            state: CIRCUIT_STATE.OPEN,
            failures,
            lastFailureAt: now,
            openedAt: now,
            halfOpenAttempts: s.halfOpenAttempts + 1,
          }
        }

        if (relevant >= cfg.failureThreshold) {
          return {
            state: CIRCUIT_STATE.OPEN,
            failures,
            lastFailureAt: now,
            openedAt: now,
            halfOpenAttempts: 0,
          }
        }

        return { ...s, failures, lastFailureAt: now }
      })

    const recordSuccess = (): Effect.Effect<void> =>
      Ref.update(stateRef, (s) => {
        if (s.state === CIRCUIT_STATE.HALF_OPEN) {
          return {
            state: CIRCUIT_STATE.CLOSED,
            failures: [],
            lastFailureAt: undefined,
            openedAt: undefined,
            halfOpenAttempts: 0,
          }
        }
        return s
      })

    const execute = <A, E>(
      effect: Effect.Effect<A, E>,
      failureType?: FailureType,
    ): Effect.Effect<A, E | CircuitOpen> =>
      Effect.gen(function* () {
        const now = Date.now()
        const current = yield* Ref.get(stateRef)
        const evaluated = evaluateState(current, now)

        if (evaluated !== current) {
          yield* Ref.set(stateRef, evaluated)
        }

        if (evaluated.state === CIRCUIT_STATE.OPEN) {
          const until = (evaluated.openedAt ?? now) + cfg.resetTimeoutMs
          return yield* Effect.fail(new CircuitOpen({ service, until }))
        }

        if (
          evaluated.state === CIRCUIT_STATE.HALF_OPEN &&
          evaluated.halfOpenAttempts >= cfg.halfOpenMaxAttempts
        ) {
          yield* Ref.update(stateRef, (s) => ({
            ...s,
            state: CIRCUIT_STATE.OPEN,
            openedAt: now,
          }))
          const until = now + cfg.resetTimeoutMs
          return yield* Effect.fail(new CircuitOpen({ service, until }))
        }

        const exit = yield* Effect.exit(effect)

        if (exit._tag === "Failure") {
          if (failureType) {
            yield* recordFailure(failureType)
          }
          return yield* Effect.failCause(exit.cause) as never
        }

        yield* recordSuccess()
        return exit.value
      })

    const snapshot = (): Effect.Effect<CircuitSnapshot> =>
      Effect.map(Ref.get(stateRef), (s) => ({
        state: evaluateState(s, Date.now()).state,
        failures: s.failures,
        lastFailureAt: s.lastFailureAt,
        openedAt: s.openedAt,
        halfOpenAttempts: s.halfOpenAttempts,
      }))

    const reset = (): Effect.Effect<void> =>
      Ref.set(stateRef, {
        state: CIRCUIT_STATE.CLOSED,
        failures: [],
        lastFailureAt: undefined,
        openedAt: undefined,
        halfOpenAttempts: 0,
      })

    return { execute, recordFailure, recordSuccess, snapshot, reset }
  })
}
