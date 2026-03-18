import { describe, it, expect } from "vitest"
import { evaluateApproval, APPROVAL_DECISION } from "../domain/approval-gate.js"
import { RISK_LEVEL, type RiskLevel } from "../domain/blast-radius.js"
import type { Severity } from "@orchestrix/shared"

describe("evaluateApproval", () => {
  const cases: Array<{
    severity: Severity
    riskLevel: RiskLevel
    expected: typeof APPROVAL_DECISION.AUTO_APPROVED | typeof APPROVAL_DECISION.REQUIRES_HUMAN
  }> = [
    // P1: always auto-approve
    { severity: "P1", riskLevel: RISK_LEVEL.LOW, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P1", riskLevel: RISK_LEVEL.MEDIUM, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P1", riskLevel: RISK_LEVEL.HIGH, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P1", riskLevel: RISK_LEVEL.CRITICAL, expected: APPROVAL_DECISION.AUTO_APPROVED },

    // P2: always auto-approve
    { severity: "P2", riskLevel: RISK_LEVEL.LOW, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P2", riskLevel: RISK_LEVEL.HIGH, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P2", riskLevel: RISK_LEVEL.CRITICAL, expected: APPROVAL_DECISION.AUTO_APPROVED },

    // P3: auto-approve if low blast radius, else human
    { severity: "P3", riskLevel: RISK_LEVEL.LOW, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P3", riskLevel: RISK_LEVEL.MEDIUM, expected: APPROVAL_DECISION.AUTO_APPROVED },
    { severity: "P3", riskLevel: RISK_LEVEL.HIGH, expected: APPROVAL_DECISION.REQUIRES_HUMAN },
    { severity: "P3", riskLevel: RISK_LEVEL.CRITICAL, expected: APPROVAL_DECISION.REQUIRES_HUMAN },

    // P4: always requires human
    { severity: "P4", riskLevel: RISK_LEVEL.LOW, expected: APPROVAL_DECISION.REQUIRES_HUMAN },
    { severity: "P4", riskLevel: RISK_LEVEL.HIGH, expected: APPROVAL_DECISION.REQUIRES_HUMAN },

    // P5: always requires human
    { severity: "P5", riskLevel: RISK_LEVEL.LOW, expected: APPROVAL_DECISION.REQUIRES_HUMAN },
    { severity: "P5", riskLevel: RISK_LEVEL.CRITICAL, expected: APPROVAL_DECISION.REQUIRES_HUMAN },
  ]

  it.each(cases)(
    "returns $expected for severity=$severity riskLevel=$riskLevel",
    ({ severity, riskLevel, expected }) => {
      const result = evaluateApproval(severity, riskLevel)
      expect(result.decision).toBe(expected)
    },
  )

  it("includes a reason in the decision", () => {
    const result = evaluateApproval("P1", RISK_LEVEL.HIGH)

    expect(result.reason).toBeTruthy()
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it("reason mentions severity for auto-approved P1", () => {
    const result = evaluateApproval("P1", RISK_LEVEL.CRITICAL)

    expect(result.reason).toContain("P1")
  })

  it("reason mentions blast radius for P3 requiring human", () => {
    const result = evaluateApproval("P3", RISK_LEVEL.HIGH)

    expect(result.reason).toContain("HIGH")
    expect(result.decision).toBe(APPROVAL_DECISION.REQUIRES_HUMAN)
  })
})
