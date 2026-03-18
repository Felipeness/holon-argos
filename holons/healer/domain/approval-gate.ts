import type { Severity } from "@orchestrix/shared"
import { RISK_LEVEL, type RiskLevel } from "./blast-radius.js"

export const APPROVAL_DECISION = {
  AUTO_APPROVED: "auto_approved",
  REQUIRES_HUMAN: "requires_human",
} as const

export type ApprovalDecisionType = (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION]

export interface ApprovalDecision {
  readonly decision: ApprovalDecisionType
  readonly reason: string
}

const isLowBlastRadius = (riskLevel: RiskLevel): boolean =>
  riskLevel === RISK_LEVEL.LOW || riskLevel === RISK_LEVEL.MEDIUM

export const evaluateApproval = (
  severity: Severity,
  riskLevel: RiskLevel,
): ApprovalDecision => {
  if (severity === "P1" || severity === "P2") {
    return {
      decision: APPROVAL_DECISION.AUTO_APPROVED,
      reason: `severity ${severity} qualifies for auto-approval (immediate action needed)`,
    }
  }

  if (severity === "P3") {
    return isLowBlastRadius(riskLevel)
      ? {
          decision: APPROVAL_DECISION.AUTO_APPROVED,
          reason: `severity P3 with ${riskLevel} blast radius qualifies for auto-approval`,
        }
      : {
          decision: APPROVAL_DECISION.REQUIRES_HUMAN,
          reason: `severity P3 with ${riskLevel} blast radius requires human approval`,
        }
  }

  return {
    decision: APPROVAL_DECISION.REQUIRES_HUMAN,
    reason: `severity ${severity} always requires human approval`,
  }
}
