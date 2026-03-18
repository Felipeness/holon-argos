import type { IncidentStatus } from "@argos/shared"
import { INCIDENT_STATUS } from "@argos/shared"

const DIAGNOSIS_TIMEOUT_MS = 5 * 60 * 1000
const HEALING_TIMEOUT_MS = 10 * 60 * 1000
const TOTAL_TIMEOUT_MS = 30 * 60 * 1000

export const ESCALATION_TARGETS = {
  ENGINEERING: "engineering",
  MANAGEMENT: "management",
} as const

export type EscalationTarget = (typeof ESCALATION_TARGETS)[keyof typeof ESCALATION_TARGETS]

export interface EscalationDecision {
  readonly shouldEscalate: boolean
  readonly reason: string
  readonly target: EscalationTarget
  readonly elapsedMs: number
  readonly thresholdMs: number
}

const noEscalation: EscalationDecision = {
  shouldEscalate: false,
  reason: "within_threshold",
  target: ESCALATION_TARGETS.ENGINEERING,
  elapsedMs: 0,
  thresholdMs: 0,
}

export const evaluateEscalation = (
  status: IncidentStatus,
  phaseStartedAt: number,
  incidentStartedAt: number,
  now: number,
): EscalationDecision => {
  const totalElapsed = now - incidentStartedAt
  if (totalElapsed > TOTAL_TIMEOUT_MS) {
    return {
      shouldEscalate: true,
      reason: "total_incident_timeout",
      target: ESCALATION_TARGETS.MANAGEMENT,
      elapsedMs: totalElapsed,
      thresholdMs: TOTAL_TIMEOUT_MS,
    }
  }

  const phaseElapsed = now - phaseStartedAt

  if (status === INCIDENT_STATUS.DIAGNOSING && phaseElapsed > DIAGNOSIS_TIMEOUT_MS) {
    return {
      shouldEscalate: true,
      reason: "diagnosis_timeout",
      target: ESCALATION_TARGETS.ENGINEERING,
      elapsedMs: phaseElapsed,
      thresholdMs: DIAGNOSIS_TIMEOUT_MS,
    }
  }

  if (status === INCIDENT_STATUS.HEALING && phaseElapsed > HEALING_TIMEOUT_MS) {
    return {
      shouldEscalate: true,
      reason: "healing_timeout",
      target: ESCALATION_TARGETS.ENGINEERING,
      elapsedMs: phaseElapsed,
      thresholdMs: HEALING_TIMEOUT_MS,
    }
  }

  return noEscalation
}
