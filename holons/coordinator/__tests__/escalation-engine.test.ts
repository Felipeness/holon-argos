import { describe, it, expect } from "vitest"
import { INCIDENT_STATUS } from "@argos/shared"
import { evaluateEscalation, ESCALATION_TARGETS } from "../domain/escalation-engine.js"

const MINUTE = 60 * 1000

describe("escalation-engine", () => {
  describe("diagnosis phase", () => {
    it("does not escalate when under 5 minute threshold", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 4 * MINUTE
      const incidentStart = now - 4 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.DIAGNOSING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(false)
    })

    it("escalates when diagnosis exceeds 5 minutes", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 6 * MINUTE
      const incidentStart = now - 6 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.DIAGNOSING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(true)
      expect(decision.reason).toBe("diagnosis_timeout")
      expect(decision.target).toBe(ESCALATION_TARGETS.ENGINEERING)
    })
  })

  describe("healing phase", () => {
    it("does not escalate when under 10 minute threshold", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 9 * MINUTE
      const incidentStart = now - 15 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.HEALING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(false)
    })

    it("escalates when healing exceeds 10 minutes", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 11 * MINUTE
      const incidentStart = now - 15 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.HEALING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(true)
      expect(decision.reason).toBe("healing_timeout")
      expect(decision.target).toBe(ESCALATION_TARGETS.ENGINEERING)
    })
  })

  describe("total incident timeout", () => {
    it("escalates to management when total exceeds 30 minutes", () => {
      const now = 1_700_000_000_000
      const incidentStart = now - 31 * MINUTE
      const phaseStart = now - 2 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.DIAGNOSING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(true)
      expect(decision.reason).toBe("total_incident_timeout")
      expect(decision.target).toBe(ESCALATION_TARGETS.MANAGEMENT)
    })

    it("prioritizes total timeout over phase timeout", () => {
      const now = 1_700_000_000_000
      const incidentStart = now - 35 * MINUTE
      const phaseStart = now - 7 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.DIAGNOSING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.reason).toBe("total_incident_timeout")
      expect(decision.target).toBe(ESCALATION_TARGETS.MANAGEMENT)
    })
  })

  describe("non-timeout phases", () => {
    it("does not escalate in ASSESSING phase even after long duration", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 8 * MINUTE
      const incidentStart = now - 12 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.ASSESSING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(false)
    })

    it("does not escalate in VERIFYING phase", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 8 * MINUTE
      const incidentStart = now - 20 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.VERIFYING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.shouldEscalate).toBe(false)
    })
  })

  describe("escalation decision metadata", () => {
    it("includes elapsed time and threshold in decision", () => {
      const now = 1_700_000_000_000
      const phaseStart = now - 7 * MINUTE
      const incidentStart = now - 7 * MINUTE

      const decision = evaluateEscalation(
        INCIDENT_STATUS.DIAGNOSING,
        phaseStart,
        incidentStart,
        now,
      )

      expect(decision.elapsedMs).toBe(7 * MINUTE)
      expect(decision.thresholdMs).toBe(5 * MINUTE)
    })
  })
})
