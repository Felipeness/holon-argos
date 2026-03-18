import { Effect, Ref } from "effect"

export interface Span {
  readonly traceId: string
  readonly spanId: string
  readonly parentSpanId?: string
  readonly name: string
  readonly startTime: number
  readonly endTime?: number
  readonly attributes: Record<string, unknown>
  readonly status: "OK" | "ERROR" | "UNSET"
}

export interface Tracer {
  readonly startSpan: (name: string, attributes?: Record<string, unknown>) => Effect.Effect<Span>
  readonly endSpan: (spanId: string, status?: "OK" | "ERROR") => Effect.Effect<void>
  readonly getSpans: () => Effect.Effect<readonly Span[]>
}

let spanCounter = 0
const nextSpanId = () => `span-${++spanCounter}`
const nextTraceId = () => `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const makeInMemoryTracer = (): Effect.Effect<Tracer> =>
  Effect.gen(function* () {
    const spans = yield* Ref.make<Map<string, Span>>(new Map())

    return {
      startSpan: (name, attributes = {}) =>
        Effect.gen(function* () {
          const span: Span = {
            traceId: nextTraceId(),
            spanId: nextSpanId(),
            name,
            startTime: Date.now(),
            attributes,
            status: "UNSET",
          }
          yield* Ref.update(spans, (m) => {
            const copy = new Map(m)
            copy.set(span.spanId, span)
            return copy
          })
          return span
        }),

      endSpan: (spanId, status = "OK") =>
        Ref.update(spans, (m) => {
          const copy = new Map(m)
          const span = copy.get(spanId)
          if (span) {
            copy.set(spanId, { ...span, endTime: Date.now(), status })
          }
          return copy
        }),

      getSpans: () => Effect.map(Ref.get(spans), (m) => Array.from(m.values())),
    }
  })
