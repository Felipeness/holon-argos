import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import {
  makeBufferedLogger,
  makeInMemoryMetrics,
  makeInMemoryTracer,
} from "../src/index.js"
import type { StructuredLog } from "../src/index.js"

describe("Logger", () => {
  it("writes structured logs to buffer", async () => {
    const buffer: StructuredLog[] = []
    const logger = makeBufferedLogger(buffer)

    await Effect.runPromise(logger.info("test message", { key: "value" }))

    expect(buffer).toHaveLength(1)
    expect(buffer[0]!.level).toBe("INFO")
    expect(buffer[0]!.message).toBe("test message")
    expect(buffer[0]!.attributes).toEqual({ key: "value" })
  })

  it("creates child logger with inherited attributes", async () => {
    const buffer: StructuredLog[] = []
    const logger = makeBufferedLogger(buffer)
    const child = logger.child({ holonId: "sentinel-1" })

    await Effect.runPromise(child.info("from child"))

    expect(buffer[0]!.attributes).toEqual({ holonId: "sentinel-1" })
  })

  it("logs at all levels", async () => {
    const buffer: StructuredLog[] = []
    const logger = makeBufferedLogger(buffer)

    await Effect.runPromise(
      Effect.all([
        logger.debug("debug msg"),
        logger.info("info msg"),
        logger.warn("warn msg"),
        logger.error("error msg"),
      ]),
    )

    expect(buffer.map((l) => l.level)).toEqual(["DEBUG", "INFO", "WARN", "ERROR"])
  })
})

describe("Metrics", () => {
  it("records increment", async () => {
    const points = await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* makeInMemoryMetrics()
        yield* metrics.increment("requests_total", { method: "GET" })
        return yield* metrics.getAll()
      }),
    )

    expect(points).toHaveLength(1)
    expect(points[0]!.name).toBe("requests_total")
    expect(points[0]!.value).toBe(1)
    expect(points[0]!.labels).toEqual({ method: "GET" })
  })

  it("records gauge and histogram", async () => {
    const points = await Effect.runPromise(
      Effect.gen(function* () {
        const metrics = yield* makeInMemoryMetrics()
        yield* metrics.gauge("cpu_usage", 0.85, { host: "node-1" })
        yield* metrics.histogram("response_time_ms", 42.5)
        return yield* metrics.getAll()
      }),
    )

    expect(points).toHaveLength(2)
    expect(points[0]!.value).toBe(0.85)
    expect(points[1]!.value).toBe(42.5)
  })
})

describe("Tracer", () => {
  it("creates and ends spans", async () => {
    const spans = await Effect.runPromise(
      Effect.gen(function* () {
        const tracer = yield* makeInMemoryTracer()
        const span = yield* tracer.startSpan("diagnose-incident", { incidentId: "inc-1" })
        yield* tracer.endSpan(span.spanId, "OK")
        return yield* tracer.getSpans()
      }),
    )

    expect(spans).toHaveLength(1)
    expect(spans[0]!.name).toBe("diagnose-incident")
    expect(spans[0]!.status).toBe("OK")
    expect(spans[0]!.endTime).toBeDefined()
    expect(spans[0]!.attributes).toEqual({ incidentId: "inc-1" })
  })

  it("starts span with UNSET status", async () => {
    const spans = await Effect.runPromise(
      Effect.gen(function* () {
        const tracer = yield* makeInMemoryTracer()
        yield* tracer.startSpan("pending-op")
        return yield* tracer.getSpans()
      }),
    )

    expect(spans[0]!.status).toBe("UNSET")
    expect(spans[0]!.endTime).toBeUndefined()
  })
})
