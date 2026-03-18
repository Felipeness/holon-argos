import { Effect, Ref } from "effect"

export interface MetricPoint {
  readonly name: string
  readonly value: number
  readonly labels: Record<string, string>
  readonly timestamp: number
}

export interface MetricsCollector {
  readonly increment: (name: string, labels?: Record<string, string>) => Effect.Effect<void>
  readonly gauge: (name: string, value: number, labels?: Record<string, string>) => Effect.Effect<void>
  readonly histogram: (name: string, value: number, labels?: Record<string, string>) => Effect.Effect<void>
  readonly getAll: () => Effect.Effect<readonly MetricPoint[]>
}

export const makeInMemoryMetrics = (): Effect.Effect<MetricsCollector> =>
  Effect.gen(function* () {
    const points = yield* Ref.make<MetricPoint[]>([])

    const record = (name: string, value: number, labels: Record<string, string> = {}) =>
      Ref.update(points, (p) => [...p, { name, value, labels, timestamp: Date.now() }])

    return {
      increment: (name, labels) => record(name, 1, labels),
      gauge: (name, value, labels) => record(name, value, labels),
      histogram: (name, value, labels) => record(name, value, labels),
      getAll: () => Ref.get(points),
    }
  })
