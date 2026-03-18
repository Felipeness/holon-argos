import { describe, it, expect } from "vitest"
import { Effect, Ref } from "effect"
import { runSaga } from "@argos/blueprint-engine"
import { buildRollbackPlan, RemediationStepError, type RemediationAction } from "../domain/rollback-engine.js"

describe("buildRollbackPlan", () => {
  it("creates saga steps from remediation actions", () => {
    const actions: RemediationAction[] = [
      {
        name: "scale-up",
        execute: () => Effect.succeed("scaled"),
        compensate: () => Effect.void,
      },
      {
        name: "deploy-fix",
        execute: () => Effect.succeed("deployed"),
        compensate: () => Effect.void,
      },
    ]

    const plan = buildRollbackPlan(actions)

    expect(plan.totalSteps).toBe(2)
    expect(plan.steps).toHaveLength(2)
    expect(plan.steps[0]!.name).toBe("scale-up")
    expect(plan.steps[1]!.name).toBe("deploy-fix")
  })

  it("executes all steps successfully through saga runner", async () => {
    const actions: RemediationAction[] = [
      {
        name: "step-1",
        execute: () => Effect.succeed("result-1"),
        compensate: () => Effect.void,
      },
      {
        name: "step-2",
        execute: () => Effect.succeed("result-2"),
        compensate: () => Effect.void,
      },
      {
        name: "step-3",
        execute: () => Effect.succeed("result-3"),
        compensate: () => Effect.void,
      },
    ]

    const plan = buildRollbackPlan(actions)
    const result = await Effect.runPromise(runSaga(plan.steps))

    expect(result.completed).toHaveLength(3)
    expect(result.failed).toBeUndefined()
    expect(result.compensated).toEqual([])
  })

  it("compensates step 1 when step 2 fails", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const log = yield* Ref.make<string[]>([])

        const actions: RemediationAction[] = [
          {
            name: "provision-db",
            execute: () => Effect.succeed("provisioned"),
            compensate: () => Ref.update(log, (l) => [...l, "deprovision-db"]),
          },
          {
            name: "migrate-data",
            execute: () => Effect.fail(RemediationStepError("migrate-data", "migration failed")),
            compensate: () => Ref.update(log, (l) => [...l, "rollback-migration"]),
          },
          {
            name: "switch-traffic",
            execute: () => Effect.succeed("switched"),
            compensate: () => Ref.update(log, (l) => [...l, "revert-traffic"]),
          },
        ]

        const plan = buildRollbackPlan(actions)
        const sagaResult = yield* runSaga(plan.steps)
        const compensationLog = yield* Ref.get(log)

        return { sagaResult, compensationLog }
      }),
    )

    expect(result.sagaResult.completed).toHaveLength(1)
    expect(result.sagaResult.completed[0]!.name).toBe("provision-db")
    expect(result.sagaResult.failed?.name).toBe("migrate-data")
    expect(result.sagaResult.compensated).toEqual(["provision-db"])
    expect(result.compensationLog).toEqual(["deprovision-db"])
  })

  it("compensates in reverse order when later step fails", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const order = yield* Ref.make<string[]>([])

        const actions: RemediationAction[] = [
          {
            name: "A",
            execute: () => Effect.succeed("a"),
            compensate: () => Ref.update(order, (o) => [...o, "compensate-A"]),
          },
          {
            name: "B",
            execute: () => Effect.succeed("b"),
            compensate: () => Ref.update(order, (o) => [...o, "compensate-B"]),
          },
          {
            name: "C",
            execute: () => Effect.fail(RemediationStepError("C", "boom")),
            compensate: () => Ref.update(order, (o) => [...o, "compensate-C"]),
          },
        ]

        const plan = buildRollbackPlan(actions)
        yield* runSaga(plan.steps)
        return yield* Ref.get(order)
      }),
    )

    expect(result).toEqual(["compensate-B", "compensate-A"])
  })

  it("handles failure on first step with no compensation needed", async () => {
    const actions: RemediationAction[] = [
      {
        name: "step-1",
        execute: () => Effect.fail(RemediationStepError("step-1", "immediate failure")),
        compensate: () => Effect.void,
      },
    ]

    const plan = buildRollbackPlan(actions)
    const result = await Effect.runPromise(runSaga(plan.steps))

    expect(result.completed).toHaveLength(0)
    expect(result.failed?.name).toBe("step-1")
    expect(result.compensated).toEqual([])
  })
})
