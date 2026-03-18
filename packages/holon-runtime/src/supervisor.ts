import { Effect } from "effect"

export const RESTART_STRATEGY = {
  ONE_FOR_ONE: "ONE_FOR_ONE",
  ONE_FOR_ALL: "ONE_FOR_ALL",
} as const

export type RestartStrategy = (typeof RESTART_STRATEGY)[keyof typeof RESTART_STRATEGY]

export interface SupervisorConfig {
  readonly maxRestarts: number
  readonly withinMs: number
  readonly strategy: RestartStrategy
}

export const defaultSupervisorConfig: SupervisorConfig = {
  maxRestarts: 3,
  withinMs: 60_000,
  strategy: RESTART_STRATEGY.ONE_FOR_ONE,
}

export interface SupervisedChild {
  readonly id: string
  readonly start: () => Effect.Effect<void>
  readonly stop: () => Effect.Effect<void>
}

export interface Supervisor {
  readonly register: (child: SupervisedChild) => Effect.Effect<void>
  readonly handleFailure: (childId: string) => Effect.Effect<"restarted" | "escalated">
}

export const makeSupervisor = (
  config: SupervisorConfig = defaultSupervisorConfig,
): Supervisor => {
  const restartHistory = new Map<string, number[]>()
  const children = new Map<string, SupervisedChild>()

  const register = (child: SupervisedChild): Effect.Effect<void> =>
    Effect.sync(() => {
      children.set(child.id, child)
      restartHistory.set(child.id, [])
    })

  const handleFailure = (childId: string): Effect.Effect<"restarted" | "escalated"> =>
    Effect.gen(function* () {
      const history = restartHistory.get(childId) ?? []
      const now = Date.now()
      const recent = history.filter((t) => now - t < config.withinMs)

      if (recent.length >= config.maxRestarts) {
        return "escalated" as const
      }

      restartHistory.set(childId, [...recent, now])

      if (config.strategy === RESTART_STRATEGY.ONE_FOR_ALL) {
        for (const child of children.values()) {
          yield* child.stop()
          yield* child.start()
        }
      } else {
        const child = children.get(childId)
        if (child) {
          yield* child.stop()
          yield* child.start()
        }
      }

      return "restarted" as const
    })

  return { register, handleFailure }
}
