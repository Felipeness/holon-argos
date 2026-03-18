import { describe, it, expect } from "vitest"
import { SEVERITY } from "@argos/shared"
import { calculateSLAMetrics, calculateAllSeverities } from "../domain/sla-tracker.js"
import type { IncidentTimestamp } from "../domain/sla-tracker.js"

const MINUTE = 60 * 1000

const makeIncident = (overrides: Partial<IncidentTimestamp> = {}): IncidentTimestamp => ({
  incidentId: "inc-001",
  severity: SEVERITY.P1,
  detectedAt: 1_700_000_000_000,
  acknowledgedAt: null,
  resolvedAt: null,
  ...overrides,
})

describe("sla-tracker", () => {
  describe("calculateSLAMetrics", () => {
    it("calculates MTTA from acknowledged incidents", () => {
      const base = 1_700_000_000_000
      const incidents: IncidentTimestamp[] = [
        makeIncident({ incidentId: "i1", detectedAt: base, acknowledgedAt: base + 2 * MINUTE }),
        makeIncident({ incidentId: "i2", detectedAt: base, acknowledgedAt: base + 4 * MINUTE }),
      ]

      const metrics = calculateSLAMetrics(incidents, SEVERITY.P1)

      expect(metrics.mttaMs).toBe(3 * MINUTE)
      expect(metrics.acknowledgedCount).toBe(2)
    })

    it("calculates MTTR from resolved incidents", () => {
      const base = 1_700_000_000_000
      const incidents: IncidentTimestamp[] = [
        makeIncident({ incidentId: "i1", detectedAt: base, resolvedAt: base + 10 * MINUTE }),
        makeIncident({ incidentId: "i2", detectedAt: base, resolvedAt: base + 20 * MINUTE }),
      ]

      const metrics = calculateSLAMetrics(incidents, SEVERITY.P1)

      expect(metrics.mttrMs).toBe(15 * MINUTE)
      expect(metrics.resolvedCount).toBe(2)
    })

    it("returns null MTTA when no incidents are acknowledged", () => {
      const incidents: IncidentTimestamp[] = [
        makeIncident({ incidentId: "i1" }),
      ]

      const metrics = calculateSLAMetrics(incidents, SEVERITY.P1)

      expect(metrics.mttaMs).toBeNull()
      expect(metrics.acknowledgedCount).toBe(0)
    })

    it("returns null MTTR when no incidents are resolved", () => {
      const incidents: IncidentTimestamp[] = [
        makeIncident({ incidentId: "i1" }),
      ]

      const metrics = calculateSLAMetrics(incidents, SEVERITY.P1)

      expect(metrics.mttrMs).toBeNull()
      expect(metrics.resolvedCount).toBe(0)
    })

    it("filters by severity level", () => {
      const base = 1_700_000_000_000
      const incidents: IncidentTimestamp[] = [
        makeIncident({
          incidentId: "i1",
          severity: SEVERITY.P1,
          detectedAt: base,
          acknowledgedAt: base + 2 * MINUTE,
        }),
        makeIncident({
          incidentId: "i2",
          severity: SEVERITY.P2,
          detectedAt: base,
          acknowledgedAt: base + 10 * MINUTE,
        }),
        makeIncident({
          incidentId: "i3",
          severity: SEVERITY.P1,
          detectedAt: base,
          acknowledgedAt: base + 4 * MINUTE,
        }),
      ]

      const p1Metrics = calculateSLAMetrics(incidents, SEVERITY.P1)
      const p2Metrics = calculateSLAMetrics(incidents, SEVERITY.P2)

      expect(p1Metrics.incidentCount).toBe(2)
      expect(p1Metrics.mttaMs).toBe(3 * MINUTE)
      expect(p2Metrics.incidentCount).toBe(1)
      expect(p2Metrics.mttaMs).toBe(10 * MINUTE)
    })

    it("returns zero counts for severity with no incidents", () => {
      const incidents: IncidentTimestamp[] = [
        makeIncident({ severity: SEVERITY.P1 }),
      ]

      const metrics = calculateSLAMetrics(incidents, SEVERITY.P3)

      expect(metrics.incidentCount).toBe(0)
      expect(metrics.mttaMs).toBeNull()
      expect(metrics.mttrMs).toBeNull()
    })

    it("handles mixed acknowledged and unacknowledged incidents", () => {
      const base = 1_700_000_000_000
      const incidents: IncidentTimestamp[] = [
        makeIncident({
          incidentId: "i1",
          detectedAt: base,
          acknowledgedAt: base + 2 * MINUTE,
          resolvedAt: base + 10 * MINUTE,
        }),
        makeIncident({
          incidentId: "i2",
          detectedAt: base,
          acknowledgedAt: null,
          resolvedAt: null,
        }),
      ]

      const metrics = calculateSLAMetrics(incidents, SEVERITY.P1)

      expect(metrics.incidentCount).toBe(2)
      expect(metrics.acknowledgedCount).toBe(1)
      expect(metrics.resolvedCount).toBe(1)
      expect(metrics.mttaMs).toBe(2 * MINUTE)
      expect(metrics.mttrMs).toBe(10 * MINUTE)
    })
  })

  describe("calculateAllSeverities", () => {
    it("calculates metrics for each severity", () => {
      const base = 1_700_000_000_000
      const incidents: IncidentTimestamp[] = [
        makeIncident({
          incidentId: "i1",
          severity: SEVERITY.P1,
          detectedAt: base,
          acknowledgedAt: base + 1 * MINUTE,
        }),
        makeIncident({
          incidentId: "i2",
          severity: SEVERITY.P2,
          detectedAt: base,
          acknowledgedAt: base + 5 * MINUTE,
        }),
      ]

      const allMetrics = calculateAllSeverities(incidents, [SEVERITY.P1, SEVERITY.P2, SEVERITY.P3])

      expect(allMetrics).toHaveLength(3)
      expect(allMetrics[0]!.severity).toBe(SEVERITY.P1)
      expect(allMetrics[0]!.incidentCount).toBe(1)
      expect(allMetrics[1]!.severity).toBe(SEVERITY.P2)
      expect(allMetrics[1]!.incidentCount).toBe(1)
      expect(allMetrics[2]!.severity).toBe(SEVERITY.P3)
      expect(allMetrics[2]!.incidentCount).toBe(0)
    })
  })
})
