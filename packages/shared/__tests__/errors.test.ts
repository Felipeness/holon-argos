import { describe, it, expect } from "vitest"
import {
  IncidentNotFound,
  DiagnosisFailed,
  RemediationFailed,
  ApprovalRequired,
  EscalationTriggered,
  RollbackFailed,
  InvalidTransition,
} from "../src/index.js"

describe("Tagged errors", () => {
  it("creates IncidentNotFound with _tag", () => {
    const err = new IncidentNotFound({ id: "inc-001" })
    expect(err._tag).toBe("IncidentNotFound")
    expect(err.id).toBe("inc-001")
  })

  it("creates DiagnosisFailed with attempts", () => {
    const err = new DiagnosisFailed({ reason: "timeout", attempts: 3 })
    expect(err._tag).toBe("DiagnosisFailed")
    expect(err.reason).toBe("timeout")
    expect(err.attempts).toBe(3)
  })

  it("creates RemediationFailed with step info", () => {
    const err = new RemediationFailed({ step: "restart-pod", reason: "pod not found" })
    expect(err._tag).toBe("RemediationFailed")
    expect(err.step).toBe("restart-pod")
  })

  it("creates ApprovalRequired with severity and blast_radius", () => {
    const err = new ApprovalRequired({ severity: "P1", blast_radius: "all-users" })
    expect(err._tag).toBe("ApprovalRequired")
    expect(err.severity).toBe("P1")
    expect(err.blast_radius).toBe("all-users")
  })

  it("creates EscalationTriggered with timeout_ms", () => {
    const err = new EscalationTriggered({ reason: "no response", timeout_ms: 30_000 })
    expect(err._tag).toBe("EscalationTriggered")
    expect(err.timeout_ms).toBe(30_000)
  })

  it("creates RollbackFailed", () => {
    const err = new RollbackFailed({ step: "revert-deploy", reason: "git conflict" })
    expect(err._tag).toBe("RollbackFailed")
  })

  it("creates InvalidTransition", () => {
    const err = new InvalidTransition({ from: "IDLE", to: "HEALING" })
    expect(err._tag).toBe("InvalidTransition")
    expect(err.from).toBe("IDLE")
    expect(err.to).toBe("HEALING")
  })
})
