import { Effect, Ref } from "effect"

export interface TokenBucket {
  readonly tryAcquire: (tokens?: number) => Effect.Effect<boolean>
  readonly availableTokens: () => Effect.Effect<number>
  readonly reset: () => Effect.Effect<void>
}

interface BucketState {
  tokens: number
  lastRefillAt: number
}

export interface TokenBucketConfig {
  readonly maxTokens: number
  readonly refillRate: number
  readonly refillIntervalMs: number
}

export const makeTokenBucket = (config: TokenBucketConfig): Effect.Effect<TokenBucket> =>
  Effect.gen(function* () {
    const stateRef = yield* Ref.make<BucketState>({
      tokens: config.maxTokens,
      lastRefillAt: Date.now(),
    })

    const refill = (state: BucketState, now: number): BucketState => {
      const elapsed = now - state.lastRefillAt
      const tokensToAdd = Math.floor(elapsed / config.refillIntervalMs) * config.refillRate
      if (tokensToAdd <= 0) return state

      return {
        tokens: Math.min(config.maxTokens, state.tokens + tokensToAdd),
        lastRefillAt: state.lastRefillAt + Math.floor(elapsed / config.refillIntervalMs) * config.refillIntervalMs,
      }
    }

    const tryAcquire = (tokens = 1): Effect.Effect<boolean> =>
      Ref.modify(stateRef, (state) => {
        const now = Date.now()
        const refilled = refill(state, now)

        if (refilled.tokens >= tokens) {
          return [true, { ...refilled, tokens: refilled.tokens - tokens }]
        }
        return [false, refilled]
      })

    const availableTokens = (): Effect.Effect<number> =>
      Effect.map(Ref.get(stateRef), (state) => refill(state, Date.now()).tokens)

    const reset = (): Effect.Effect<void> =>
      Ref.set(stateRef, { tokens: config.maxTokens, lastRefillAt: Date.now() })

    return { tryAcquire, availableTokens, reset }
  })
