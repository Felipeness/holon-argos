import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { analyzeWithClaude, AnalysisError } from "../infra/claude-analyzer.js"
import type { AnalysisRequest } from "../infra/claude-analyzer.js"

describe("claude-analyzer", () => {
  it("constructs valid analysis request with all fields", () => {
    const request: AnalysisRequest = {
      incidentDescription: "API latency spike to 5s p99",
      logs: "2024-01-01T00:00:00Z ERROR connection pool exhausted",
      metrics: "p99_latency: 5000ms, error_rate: 12%",
      context: "Deploy of v2.3.1 happened 10 minutes ago",
    }

    expect(request.incidentDescription).toBe("API latency spike to 5s p99")
    expect(request.logs).toBeDefined()
    expect(request.metrics).toBeDefined()
    expect(request.context).toBeDefined()
  })

  it("accepts request with only required fields", () => {
    const request: AnalysisRequest = {
      incidentDescription: "Database connection timeouts",
    }

    expect(request.incidentDescription).toBe("Database connection timeouts")
    expect(request.logs).toBeUndefined()
    expect(request.metrics).toBeUndefined()
    expect(request.context).toBeUndefined()
  })

  it("AnalysisError has correct tag", () => {
    const error = new AnalysisError("LLM timeout")

    expect(error._tag).toBe("AnalysisError")
    expect(error.reason).toBe("LLM timeout")
  })

  it("returns an Effect type", () => {
    const request: AnalysisRequest = { incidentDescription: "test" }
    const result = analyzeWithClaude(request)

    expect(Effect.isEffect(result)).toBe(true)
  })
})
