import { describe, it, expect } from "vitest"
import { Effect, Ref } from "effect"
import { makeSupervisor, RESTART_STRATEGY } from "../src/index.js"

describe("Supervisor", () => {
  it("restarts a failed child (one-for-one)", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const startCount = yield* Ref.make(0)
        const supervisor = makeSupervisor({
          maxRestarts: 3,
          withinMs: 60_000,
          strategy: RESTART_STRATEGY.ONE_FOR_ONE,
        })

        yield* supervisor.register({
          id: "child-1",
          start: () => Ref.update(startCount, (n) => n + 1),
          stop: () => Effect.void,
        })

        const outcome = yield* supervisor.handleFailure("child-1")
        const starts = yield* Ref.get(startCount)

        return { outcome, starts }
      }),
    )

    expect(result.outcome).toBe("restarted")
    expect(result.starts).toBe(1)
  })

  it("escalates after max restarts exceeded", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const supervisor = makeSupervisor({
          maxRestarts: 2,
          withinMs: 60_000,
          strategy: RESTART_STRATEGY.ONE_FOR_ONE,
        })

        yield* supervisor.register({
          id: "child-1",
          start: () => Effect.void,
          stop: () => Effect.void,
        })

        yield* supervisor.handleFailure("child-1")
        yield* supervisor.handleFailure("child-1")
        return yield* supervisor.handleFailure("child-1")
      }),
    )

    expect(result).toBe("escalated")
  })

  it("restarts all children with ONE_FOR_ALL strategy", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const starts = yield* Ref.make<string[]>([])
        const supervisor = makeSupervisor({
          maxRestarts: 5,
          withinMs: 60_000,
          strategy: RESTART_STRATEGY.ONE_FOR_ALL,
        })

        yield* supervisor.register({
          id: "child-a",
          start: () => Ref.update(starts, (s) => [...s, "child-a"]),
          stop: () => Effect.void,
        })
        yield* supervisor.register({
          id: "child-b",
          start: () => Ref.update(starts, (s) => [...s, "child-b"]),
          stop: () => Effect.void,
        })

        yield* supervisor.handleFailure("child-a")
        return yield* Ref.get(starts)
      }),
    )

    expect(result).toContain("child-a")
    expect(result).toContain("child-b")
  })
})
