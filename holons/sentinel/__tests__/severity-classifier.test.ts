import { describe, it, expect } from "vitest"
import { SEVERITY } from "@argos/shared"
import { classifySeverity, SERVICE_TIER, type IncidentContext } from "../domain/severity-classifier.js"

const makeContext = (overrides: Partial<IncidentContext> = {}): IncidentContext => ({
  serviceTier: SERVICE_TIER.STANDARD,
  userImpactPercent: 0,
  isServiceDown: false,
  durationMs: 60_000,
  ...overrides,
})

describe("severity-classifier", () => {
  describe("table-driven classification", () => {
    const cases: ReadonlyArray<{
      scenario: string
      ctx: IncidentContext
      expectedSeverity: string
      expectedAutoRemediate: boolean
    }> = [
      {
        scenario: "service down + >50% users affected → P1",
        ctx: makeContext({ isServiceDown: true, userImpactPercent: 75 }),
        expectedSeverity: SEVERITY.P1,
        expectedAutoRemediate: true,
      },
      {
        scenario: "service down + critical tier → P1",
        ctx: makeContext({ isServiceDown: true, serviceTier: SERVICE_TIER.CRITICAL, userImpactPercent: 5 }),
        expectedSeverity: SEVERITY.P1,
        expectedAutoRemediate: true,
      },
      {
        scenario: "service down + standard tier → P2",
        ctx: makeContext({ isServiceDown: true, serviceTier: SERVICE_TIER.STANDARD, userImpactPercent: 5 }),
        expectedSeverity: SEVERITY.P2,
        expectedAutoRemediate: true,
      },
      {
        scenario: ">50% users affected without service down → P1",
        ctx: makeContext({ userImpactPercent: 60 }),
        expectedSeverity: SEVERITY.P1,
        expectedAutoRemediate: true,
      },
      {
        scenario: "degraded performance + >10% users → P2",
        ctx: makeContext({ userImpactPercent: 25 }),
        expectedSeverity: SEVERITY.P2,
        expectedAutoRemediate: true,
      },
      {
        scenario: "minor issue + <10% users → P3",
        ctx: makeContext({ userImpactPercent: 5 }),
        expectedSeverity: SEVERITY.P3,
        expectedAutoRemediate: false,
      },
      {
        scenario: "low impact + <1% users → P4",
        ctx: makeContext({ userImpactPercent: 0.5 }),
        expectedSeverity: SEVERITY.P4,
        expectedAutoRemediate: false,
      },
      {
        scenario: "no user impact → P5",
        ctx: makeContext({ userImpactPercent: 0 }),
        expectedSeverity: SEVERITY.P5,
        expectedAutoRemediate: false,
      },
    ]

    it.each(cases)("$scenario", ({ ctx, expectedSeverity, expectedAutoRemediate }) => {
      const result = classifySeverity(ctx)

      expect(result.severity).toBe(expectedSeverity)
      expect(result.autoRemediate).toBe(expectedAutoRemediate)
    })
  })

  describe("duration escalation", () => {
    it("escalates severity when duration exceeds 15 minutes", () => {
      const ctx = makeContext({
        userImpactPercent: 5,
        durationMs: 1_000_000,
      })

      const result = classifySeverity(ctx)

      expect(result.severity).toBe(SEVERITY.P2)
    })

    it("does not escalate when duration is within threshold", () => {
      const ctx = makeContext({
        userImpactPercent: 5,
        durationMs: 60_000,
      })

      const result = classifySeverity(ctx)

      expect(result.severity).toBe(SEVERITY.P3)
    })
  })

  describe("tier escalation", () => {
    it("escalates severity for critical tier services", () => {
      const ctx = makeContext({
        serviceTier: SERVICE_TIER.CRITICAL,
        userImpactPercent: 5,
      })

      const result = classifySeverity(ctx)

      expect(result.severity).toBe(SEVERITY.P2)
    })

    it("does not escalate for internal tier services", () => {
      const ctx = makeContext({
        serviceTier: SERVICE_TIER.INTERNAL,
        userImpactPercent: 5,
      })

      const result = classifySeverity(ctx)

      expect(result.severity).toBe(SEVERITY.P3)
    })
  })

  describe("auto-remediation policy", () => {
    it("enables auto-remediation for P1", () => {
      const ctx = makeContext({ isServiceDown: true, userImpactPercent: 75 })

      const result = classifySeverity(ctx)

      expect(result.autoRemediate).toBe(true)
    })

    it("enables auto-remediation for P2", () => {
      const ctx = makeContext({ userImpactPercent: 25 })

      const result = classifySeverity(ctx)

      expect(result.autoRemediate).toBe(true)
    })

    it("disables auto-remediation for P3+", () => {
      const ctx = makeContext({ userImpactPercent: 5 })

      const result = classifySeverity(ctx)

      expect(result.autoRemediate).toBe(false)
    })
  })

  describe("classification reason", () => {
    it("includes severity, impact, tier, and duration in reason", () => {
      const ctx = makeContext({
        isServiceDown: true,
        userImpactPercent: 75,
        serviceTier: SERVICE_TIER.CRITICAL,
        durationMs: 120_000,
      })

      const result = classifySeverity(ctx)

      expect(result.reason).toContain("P1")
      expect(result.reason).toContain("75%")
      expect(result.reason).toContain("CRITICAL")
      expect(result.reason).toContain("service is down")
    })
  })
})
