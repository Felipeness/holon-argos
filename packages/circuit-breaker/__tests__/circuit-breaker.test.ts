import { describe, it, expect } from "vitest"
import { Effect, Exit } from "effect"
import { makeCircuitBreaker, CIRCUIT_STATE, FAILURE_TYPE } from "../src/index.js"

const run = <A>(effect: Effect.Effect<A>) => Effect.runPromise(effect)

describe("CircuitBreaker", () => {
  it("starts in CLOSED state", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc")
        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.CLOSED)
  })

  it("allows requests when CLOSED", async () => {
    const result = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc")
        return yield* cb.execute(Effect.succeed(42))
      }),
    )
    expect(result).toBe(42)
  })

  it("opens circuit after reaching failure threshold", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", { failureThreshold: 3 })

        for (let i = 0; i < 3; i++) {
          yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)
        }

        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.OPEN)
  })

  it("rejects requests when OPEN", async () => {
    const exit = await Effect.runPromise(
      Effect.exit(
        Effect.gen(function* () {
          const cb = yield* makeCircuitBreaker("test-svc", { failureThreshold: 1 })
          yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)
          return yield* cb.execute(Effect.succeed("never"))
        }),
      ),
    )
    expect(Exit.isFailure(exit)).toBe(true)
  })

  it("transitions to HALF_OPEN after reset timeout", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", {
          failureThreshold: 1,
          resetTimeoutMs: 1,
        })

        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)

        yield* Effect.sleep("5 millis")

        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.HALF_OPEN)
  })

  it("closes circuit on success in HALF_OPEN", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", {
          failureThreshold: 1,
          resetTimeoutMs: 1,
        })

        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)
        yield* Effect.sleep("5 millis")

        yield* cb.execute(Effect.succeed("ok"))

        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.CLOSED)
    expect(snap.failures).toHaveLength(0)
  })

  it("re-opens circuit on failure in HALF_OPEN", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", {
          failureThreshold: 1,
          resetTimeoutMs: 1,
        })

        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)
        yield* Effect.sleep("5 millis")

        yield* Effect.exit(cb.execute(Effect.fail("boom"), FAILURE_TYPE.SERVER_ERROR))

        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.OPEN)
  })

  it("ignores non-monitored failure types", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", {
          failureThreshold: 2,
          monitoredFailureTypes: [FAILURE_TYPE.TIMEOUT],
        })

        yield* cb.recordFailure(FAILURE_TYPE.VALIDATION)
        yield* cb.recordFailure(FAILURE_TYPE.VALIDATION)
        yield* cb.recordFailure(FAILURE_TYPE.VALIDATION)

        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.CLOSED)
  })

  it("records failures from execute with failureType", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", { failureThreshold: 2 })

        yield* Effect.exit(cb.execute(Effect.fail("err1"), FAILURE_TYPE.CONNECTION))
        yield* Effect.exit(cb.execute(Effect.fail("err2"), FAILURE_TYPE.CONNECTION))

        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.OPEN)
  })

  it("resets circuit to CLOSED", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", { failureThreshold: 1 })
        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)
        yield* cb.reset()
        return yield* cb.snapshot()
      }),
    )
    expect(snap.state).toBe(CIRCUIT_STATE.CLOSED)
    expect(snap.failures).toHaveLength(0)
  })

  it("prunes old failures outside sliding window", async () => {
    const snap = await run(
      Effect.gen(function* () {
        const cb = yield* makeCircuitBreaker("test-svc", {
          failureThreshold: 5,
          bucketSizeMs: 1,
          bucketCount: 1,
        })

        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)
        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)

        yield* Effect.sleep("10 millis")

        yield* cb.recordFailure(FAILURE_TYPE.TIMEOUT)

        return yield* cb.snapshot()
      }),
    )

    expect(snap.failures.length).toBeLessThanOrEqual(3)
    expect(snap.state).toBe(CIRCUIT_STATE.CLOSED)
  })
})
