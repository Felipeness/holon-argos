import { describe, it, expect } from "vitest"
import { assessBlastRadius, RISK_LEVEL, type ServiceGraph } from "../domain/blast-radius.js"
import type { RemediationPlan } from "@orchestrix/temporal-workflows"

const simplePlan: RemediationPlan = {
  steps: [{ name: "restart", action: "restart-pod", params: {}, timeoutMs: 30_000 }],
  rollbackPlan: [],
  estimatedDurationMs: 30_000,
}

const multiStepPlan: RemediationPlan = {
  steps: Array.from({ length: 5 }, (_, i) => ({
    name: `step-${i + 1}`,
    action: `action-${i + 1}`,
    params: {},
    timeoutMs: 10_000,
  })),
  rollbackPlan: [],
  estimatedDurationMs: 50_000,
}

describe("assessBlastRadius", () => {
  it("returns LOW risk for a single isolated service", () => {
    const graph: ServiceGraph = {
      services: [{ id: "svc-a", name: "Service A", estimatedUsers: 10 }],
      dependencies: [],
    }

    const result = assessBlastRadius(simplePlan, "svc-a", graph)

    expect(result.riskLevel).toBe(RISK_LEVEL.LOW)
    expect(result.affectedServices).toEqual(["svc-a"])
    expect(result.directlyAffected).toEqual([])
    expect(result.transitivelyAffected).toEqual([])
  })

  it("returns MEDIUM risk with one downstream service", () => {
    const graph: ServiceGraph = {
      services: [
        { id: "svc-a", name: "Service A", estimatedUsers: 50 },
        { id: "svc-b", name: "Service B", estimatedUsers: 50 },
      ],
      dependencies: [{ from: "svc-a", to: "svc-b" }],
    }

    const result = assessBlastRadius(simplePlan, "svc-a", graph)

    expect(result.riskLevel).toBe(RISK_LEVEL.MEDIUM)
    expect(result.directlyAffected).toEqual(["svc-b"])
    expect(result.affectedServices).toContain("svc-a")
    expect(result.affectedServices).toContain("svc-b")
  })

  it("returns HIGH risk with many downstream services", () => {
    const graph: ServiceGraph = {
      services: [
        { id: "gateway", name: "Gateway", estimatedUsers: 200 },
        { id: "auth", name: "Auth", estimatedUsers: 200 },
        { id: "users", name: "Users", estimatedUsers: 200 },
        { id: "payments", name: "Payments", estimatedUsers: 500 },
      ],
      dependencies: [
        { from: "gateway", to: "auth" },
        { from: "gateway", to: "users" },
        { from: "gateway", to: "payments" },
      ],
    }

    const result = assessBlastRadius(simplePlan, "gateway", graph)

    expect(result.riskLevel).toBe(RISK_LEVEL.HIGH)
    expect(result.directlyAffected).toHaveLength(3)
  })

  it("includes transitively affected services", () => {
    const graph: ServiceGraph = {
      services: [
        { id: "a", name: "A", estimatedUsers: 10 },
        { id: "b", name: "B", estimatedUsers: 10 },
        { id: "c", name: "C", estimatedUsers: 10 },
      ],
      dependencies: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    }

    const result = assessBlastRadius(simplePlan, "a", graph)

    expect(result.directlyAffected).toEqual(["b"])
    expect(result.transitivelyAffected).toEqual(["c"])
    expect(result.affectedServices).toEqual(["a", "b", "c"])
  })

  it("sums estimated affected users across services", () => {
    const graph: ServiceGraph = {
      services: [
        { id: "svc-a", name: "A", estimatedUsers: 100 },
        { id: "svc-b", name: "B", estimatedUsers: 500 },
      ],
      dependencies: [{ from: "svc-a", to: "svc-b" }],
    }

    const result = assessBlastRadius(simplePlan, "svc-a", graph)

    expect(result.estimatedAffectedUsers).toBe(600)
  })

  it("returns CRITICAL for high user count", () => {
    const graph: ServiceGraph = {
      services: [
        { id: "gateway", name: "Gateway", estimatedUsers: 10_000 },
        { id: "backend", name: "Backend", estimatedUsers: 5_000 },
      ],
      dependencies: [{ from: "gateway", to: "backend" }],
    }

    const result = assessBlastRadius(simplePlan, "gateway", graph)

    expect(result.riskLevel).toBe(RISK_LEVEL.CRITICAL)
  })

  it("returns CRITICAL for many remediation steps", () => {
    const graph: ServiceGraph = {
      services: [{ id: "svc-a", name: "A", estimatedUsers: 10 }],
      dependencies: [],
    }

    const result = assessBlastRadius(multiStepPlan, "svc-a", graph)

    expect(result.riskLevel).toBe(RISK_LEVEL.CRITICAL)
  })

  it("handles cyclic dependencies without infinite loop", () => {
    const graph: ServiceGraph = {
      services: [
        { id: "a", name: "A", estimatedUsers: 10 },
        { id: "b", name: "B", estimatedUsers: 10 },
      ],
      dependencies: [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
      ],
    }

    const result = assessBlastRadius(simplePlan, "a", graph)

    expect(result.affectedServices).toContain("a")
    expect(result.affectedServices).toContain("b")
  })
})
