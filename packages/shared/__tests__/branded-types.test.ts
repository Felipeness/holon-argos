import { describe, it, expect } from "vitest"
import { IncidentId, AlertId, ServiceId, RunbookId, AlertFingerprint } from "../src/index.js"

describe("Branded types", () => {
  it("creates IncidentId from string", () => {
    const id = IncidentId("inc-001")
    expect(id).toBe("inc-001")
  })

  it("creates AlertId from string", () => {
    const id = AlertId("alert-001")
    expect(id).toBe("alert-001")
  })

  it("creates ServiceId from string", () => {
    const id = ServiceId("svc-api")
    expect(id).toBe("svc-api")
  })

  it("creates RunbookId from string", () => {
    const id = RunbookId("rb-001")
    expect(id).toBe("rb-001")
  })

  it("creates AlertFingerprint from string", () => {
    const fp = AlertFingerprint("fp-abc123")
    expect(fp).toBe("fp-abc123")
  })

  it("maintains type safety between different branded types", () => {
    const incId = IncidentId("same-string")
    const alertId = AlertId("same-string")

    expect(incId).toBe(alertId)
    // Type system prevents: const wrongAssignment: IncidentId = alertId
  })
})
