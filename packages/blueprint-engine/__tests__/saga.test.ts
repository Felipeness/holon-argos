import { describe, it, expect } from "vitest"
import { Effect, Ref } from "effect"
import { runSaga, createStep } from "../src/saga.js"

describe("Saga execution", () => {
  it("completes all steps successfully", async () => {
    const steps = [
      createStep("step-1", Effect.succeed("a"), Effect.void),
      createStep("step-2", Effect.succeed("b"), Effect.void),
      createStep("step-3", Effect.succeed("c"), Effect.void),
    ]

    const result = await Effect.runPromise(runSaga(steps))

    expect(result.completed).toHaveLength(3)
    expect(result.completed.map((c) => c.name)).toEqual(["step-1", "step-2", "step-3"])
    expect(result.completed.map((c) => c.result)).toEqual(["a", "b", "c"])
    expect(result.failed).toBeUndefined()
    expect(result.compensated).toEqual([])
  })

  it("compensates completed steps on failure", async () => {
    const compensated = await Effect.runPromise(
      Effect.gen(function* () {
        const log = yield* Ref.make<string[]>([])

        const steps = [
          createStep(
            "step-1",
            Effect.succeed("a"),
            Ref.update(log, (l) => [...l, "compensate-1"]),
          ),
          createStep(
            "step-2",
            Effect.succeed("b"),
            Ref.update(log, (l) => [...l, "compensate-2"]),
          ),
          createStep(
            "step-3",
            Effect.fail("boom" as const),
            Ref.update(log, (l) => [...l, "compensate-3"]),
          ),
        ]

        const result = yield* runSaga(steps)
        const compensationLog = yield* Ref.get(log)

        return { result, compensationLog }
      }),
    )

    expect(compensated.result.completed).toHaveLength(2)
    expect(compensated.result.failed?.name).toBe("step-3")
    expect(compensated.result.compensated).toEqual(["step-2", "step-1"])
    expect(compensated.compensationLog).toEqual(["compensate-2", "compensate-1"])
  })

  it("compensates in reverse order", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const order = yield* Ref.make<string[]>([])

        const steps = [
          createStep(
            "A",
            Effect.succeed(1),
            Ref.update(order, (o) => [...o, "A"]),
          ),
          createStep(
            "B",
            Effect.succeed(2),
            Ref.update(order, (o) => [...o, "B"]),
          ),
          createStep(
            "C",
            Effect.succeed(3),
            Ref.update(order, (o) => [...o, "C"]),
          ),
          createStep("D", Effect.fail("error" as const), Effect.void),
        ]

        yield* runSaga(steps)
        return yield* Ref.get(order)
      }),
    )

    expect(result).toEqual(["C", "B", "A"])
  })

  it("handles failure on first step (nothing to compensate)", async () => {
    const steps = [
      createStep("step-1", Effect.fail("first-fail" as const), Effect.void),
      createStep("step-2", Effect.succeed("b"), Effect.void),
    ]

    const result = await Effect.runPromise(runSaga(steps))

    expect(result.completed).toHaveLength(0)
    expect(result.failed?.name).toBe("step-1")
    expect(result.compensated).toEqual([])
  })

  it("handles empty saga", async () => {
    const result = await Effect.runPromise(runSaga([]))

    expect(result.completed).toHaveLength(0)
    expect(result.failed).toBeUndefined()
    expect(result.compensated).toEqual([])
  })
})
