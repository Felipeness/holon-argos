import { describe, it, expect } from "vitest"
import { TASK_QUEUES, WORKFLOW_IDS } from "../src/index.js"
import type { IncidentContext, RemediationStep } from "../src/index.js"

describe("Temporal workflow types", () => {
  it("exports task queue constants", () => {
    expect(TASK_QUEUES.SENTINEL).toBe("sentinel-queue")
    expect(TASK_QUEUES.DIAGNOSTICIAN).toBe("diagnostician-queue")
    expect(TASK_QUEUES.HEALER).toBe("healer-queue")
    expect(TASK_QUEUES.HISTORIAN).toBe("historian-queue")
    expect(TASK_QUEUES.COORDINATOR).toBe("coordinator-queue")
  })

  it("exports workflow id constants", () => {
    expect(WORKFLOW_IDS.INCIDENT_SAGA).toBe("incident-saga")
    expect(WORKFLOW_IDS.POSTMORTEM_GENERATION).toBe("postmortem-generation")
  })

  it("validates IncidentContext shape", () => {
    const ctx: IncidentContext = {
      incidentId: "inc-001",
      severity: "P1",
      alertFingerprint: "fp-abc",
      serviceId: "svc-api",
      detectedAt: Date.now(),
    }

    expect(ctx.incidentId).toBe("inc-001")
    expect(ctx.severity).toBe("P1")
  })

  it("validates RemediationStep shape", () => {
    const step: RemediationStep = {
      name: "restart-pod",
      action: "kubectl-restart",
      params: { namespace: "prod", deployment: "api" },
      timeoutMs: 30_000,
    }

    expect(step.name).toBe("restart-pod")
    expect(step.timeoutMs).toBe(30_000)
  })
})
