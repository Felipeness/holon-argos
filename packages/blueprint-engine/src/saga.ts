import { Effect } from "effect"

export interface SagaStep<A, E> {
  readonly name: string
  readonly execute: Effect.Effect<A, E>
  readonly compensate: Effect.Effect<void, never>
}

export interface SagaResult<A> {
  readonly completed: readonly { name: string; result: A }[]
  readonly failed?: { name: string; error: unknown }
  readonly compensated: readonly string[]
}

export const runSaga = <A, E>(
  steps: readonly SagaStep<A, E>[],
): Effect.Effect<SagaResult<A>, never> =>
  Effect.gen(function* () {
    const completed: { name: string; result: A }[] = []

    for (const step of steps) {
      const exit = yield* Effect.exit(step.execute)

      if (exit._tag === "Success") {
        completed.push({ name: step.name, result: exit.value })
        continue
      }

      const compensated: string[] = []
      for (const completedStep of [...completed].reverse()) {
        const compensateStep = steps.find((s) => s.name === completedStep.name)
        if (compensateStep) {
          yield* compensateStep.compensate
          compensated.push(completedStep.name)
        }
      }

      return {
        completed: completed as readonly { name: string; result: A }[],
        failed: { name: step.name, error: exit.cause },
        compensated,
      } satisfies SagaResult<A>
    }

    return {
      completed: completed as readonly { name: string; result: A }[],
      compensated: [],
    } satisfies SagaResult<A>
  })

export const createStep = <A, E>(
  name: string,
  execute: Effect.Effect<A, E>,
  compensate: Effect.Effect<void, never>,
): SagaStep<A, E> => ({ name, execute, compensate })
