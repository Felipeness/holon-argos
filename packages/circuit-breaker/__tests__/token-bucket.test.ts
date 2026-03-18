import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { makeTokenBucket } from "../src/index.js"

const run = <A>(effect: Effect.Effect<A>) => Effect.runPromise(effect)

describe("TokenBucket", () => {
  it("allows acquisition when tokens available", async () => {
    const result = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 1000,
        })
        return yield* bucket.tryAcquire(1)
      }),
    )
    expect(result).toBe(true)
  })

  it("rejects acquisition when not enough tokens", async () => {
    const result = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 2,
          refillRate: 1,
          refillIntervalMs: 60_000,
        })
        yield* bucket.tryAcquire(2)
        return yield* bucket.tryAcquire(1)
      }),
    )
    expect(result).toBe(false)
  })

  it("reports available tokens correctly", async () => {
    const available = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 5,
          refillRate: 1,
          refillIntervalMs: 60_000,
        })
        yield* bucket.tryAcquire(3)
        return yield* bucket.availableTokens()
      }),
    )
    expect(available).toBe(2)
  })

  it("resets to max tokens", async () => {
    const available = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 60_000,
        })
        yield* bucket.tryAcquire(10)
        yield* bucket.reset()
        return yield* bucket.availableTokens()
      }),
    )
    expect(available).toBe(10)
  })

  it("refills tokens over time", async () => {
    const available = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 10,
          refillRate: 5,
          refillIntervalMs: 1,
        })
        yield* bucket.tryAcquire(10)
        yield* Effect.sleep("10 millis")
        return yield* bucket.availableTokens()
      }),
    )
    expect(available).toBeGreaterThan(0)
  })

  it("does not exceed max tokens on refill", async () => {
    const available = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 5,
          refillRate: 10,
          refillIntervalMs: 1,
        })
        yield* Effect.sleep("50 millis")
        return yield* bucket.availableTokens()
      }),
    )
    expect(available).toBeLessThanOrEqual(5)
  })

  it("acquires multiple tokens at once", async () => {
    const result = await run(
      Effect.gen(function* () {
        const bucket = yield* makeTokenBucket({
          maxTokens: 10,
          refillRate: 1,
          refillIntervalMs: 60_000,
        })
        const first = yield* bucket.tryAcquire(5)
        const second = yield* bucket.tryAcquire(5)
        const third = yield* bucket.tryAcquire(1)
        return { first, second, third }
      }),
    )
    expect(result.first).toBe(true)
    expect(result.second).toBe(true)
    expect(result.third).toBe(false)
  })
})
