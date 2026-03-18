import { describe, it, expect } from "vitest"
import { processIncident } from "../src/pipeline.js"
import type { PipelineInput } from "../src/pipeline.js"
import { SEVERITY, HOLON_ROLES } from "@argos/shared"
import { APPROVAL_DECISION } from "../../../holons/healer/domain/approval-gate.js"

const buildInput = (overrides: Partial<PipelineInput> = {}): PipelineInput => ({
  incidentId: "inc-test-001",
  serviceId: "svc-payments",
  severity: SEVERITY.P2,
  alerts: [],
  metrics: [],
  errorMessages: [],
  ...overrides,
})

describe("processIncident", () => {
  it("returns classification with correct severity", () => {
    const result = processIncident(buildInput({ severity: SEVERITY.P1 }))

    expect(result.severity).toBe(SEVERITY.P1)
    expect(result.incidentId).toBe("inc-test-001")
  })

  it("routes to sentinel holon for detected state", () => {
    const result = processIncident(buildInput())

    expect(result.targetHolon).toBe(HOLON_ROLES.SENTINEL)
  })

  it("generates hypotheses from error messages", () => {
    const result = processIncident(
      buildInput({
        errorMessages: ["OOMKilled: container exceeded memory limit"],
      }),
    )

    expect(result.hypotheses.length).toBeGreaterThan(0)
    expect(result.hypotheses[0]!.id).toBe("oom-kill")
  })

  it("matches runbooks based on top hypothesis", () => {
    const result = processIncident(
      buildInput({
        errorMessages: ["OOMKilled: container exceeded memory limit"],
      }),
    )

    expect(result.runbooks.length).toBeGreaterThan(0)
    expect(result.runbooks[0]!.runbook.category).toBe("MEMORY")
  })

  it("auto-approves high severity incidents", () => {
    const result = processIncident(buildInput({ severity: SEVERITY.P1 }))

    expect(result.approval.decision).toBe(APPROVAL_DECISION.AUTO_APPROVED)
  })

  it("requires human approval for low severity incidents", () => {
    const result = processIncident(buildInput({ severity: SEVERITY.P4 }))

    expect(result.approval.decision).toBe(APPROVAL_DECISION.REQUIRES_HUMAN)
  })

  it("records graph events for detected and diagnosed phases", () => {
    const result = processIncident(buildInput())

    expect(result.eventsRecorded).toBe(4)
    expect(result.graphEvents).toHaveLength(4)

    const eventTypes = result.graphEvents.map((e) => e.type)
    expect(eventTypes).toContain("EntityCreated")
    expect(eventTypes).toContain("RelationCreated")
  })

  it("handles incident with no matching hypotheses", () => {
    const result = processIncident(
      buildInput({
        errorMessages: ["something completely unrelated happened"],
      }),
    )

    expect(result.hypotheses).toHaveLength(0)
    expect(result.topHypothesis).toBeNull()
    expect(result.runbooks).toHaveLength(0)
  })

  it("handles multiple matching error patterns", () => {
    const result = processIncident(
      buildInput({
        errorMessages: [
          "OOMKilled: container exceeded memory limit",
          "connection pool exhausted: too many connections",
        ],
      }),
    )

    expect(result.hypotheses.length).toBeGreaterThanOrEqual(2)
    const ids = result.hypotheses.map((h) => h.id)
    expect(ids).toContain("oom-kill")
    expect(ids).toContain("db-connection-exhaustion")
  })

  it("includes metric-based hypotheses", () => {
    const result = processIncident(
      buildInput({
        metrics: [{ name: "cpu_usage", value: 95, threshold: 80 }],
      }),
    )

    expect(result.hypotheses.length).toBeGreaterThan(0)
    expect(result.hypotheses[0]!.id).toBe("cpu-throttle")
  })
})
