import { describe, it, expect } from "vitest"
import { AlertFingerprint, SEVERITY } from "@argos/shared"
import { filterNoise, type NoiseFilterConfig } from "../domain/noise-filter.js"
import type { Alert } from "../domain/index.js"

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  fingerprint: AlertFingerprint(`fp-${Math.random().toString(36).slice(2, 8)}`),
  source: "prometheus",
  message: "high cpu usage",
  severity: SEVERITY.P3,
  labels: { service: "api-gateway" },
  receivedAt: Date.now() - 60_000,
  ...overrides,
})

const config: NoiseFilterConfig = {
  flappingWindowMs: 60_000,
  flappingThreshold: 3,
  minimumDurationMs: 30_000,
}

describe("noise-filter", () => {
  it("returns empty array for empty input", () => {
    const result = filterNoise([], Date.now(), config)
    expect(result).toEqual([])
  })

  describe("flapping detection", () => {
    it("removes flapping alerts (firing and resolving rapidly)", () => {
      const now = Date.now()
      const fp = AlertFingerprint("fp-flap")
      const alerts: Alert[] = [
        makeAlert({ fingerprint: fp, receivedAt: now - 50_000 }),
        makeAlert({ fingerprint: fp, receivedAt: now - 40_000 }),
        makeAlert({ fingerprint: fp, receivedAt: now - 35_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(0)
    })

    it("keeps alerts that do not reach flapping threshold", () => {
      const now = Date.now()
      const fp = AlertFingerprint("fp-stable")
      const alerts: Alert[] = [
        makeAlert({ fingerprint: fp, receivedAt: now - 50_000 }),
        makeAlert({ fingerprint: fp, receivedAt: now - 40_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(1)
    })
  })

  describe("deduplication", () => {
    it("removes duplicate alerts by fingerprint", () => {
      const now = Date.now()
      const fp = AlertFingerprint("fp-dup")
      const alerts: Alert[] = [
        makeAlert({ fingerprint: fp, receivedAt: now - 60_000 }),
        makeAlert({ fingerprint: fp, receivedAt: now - 55_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(1)
      expect(result[0]!.fingerprint).toBe(fp)
    })

    it("keeps alerts with different fingerprints", () => {
      const now = Date.now()
      const alerts: Alert[] = [
        makeAlert({ fingerprint: AlertFingerprint("fp-a"), receivedAt: now - 60_000 }),
        makeAlert({ fingerprint: AlertFingerprint("fp-b"), receivedAt: now - 55_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(2)
    })
  })

  describe("minimum duration", () => {
    it("filters alerts that have not persisted long enough", () => {
      const now = Date.now()
      const alerts: Alert[] = [
        makeAlert({ fingerprint: AlertFingerprint("fp-short"), receivedAt: now - 10_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(0)
    })

    it("keeps alerts that have persisted beyond minimum duration", () => {
      const now = Date.now()
      const alerts: Alert[] = [
        makeAlert({ fingerprint: AlertFingerprint("fp-long"), receivedAt: now - 60_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(1)
    })
  })

  describe("combined filtering", () => {
    it("applies all filters together", () => {
      const now = Date.now()
      const flappingFp = AlertFingerprint("fp-flap")
      const shortFp = AlertFingerprint("fp-short")
      const goodFp = AlertFingerprint("fp-good")

      const alerts: Alert[] = [
        // flapping — removed
        makeAlert({ fingerprint: flappingFp, receivedAt: now - 50_000 }),
        makeAlert({ fingerprint: flappingFp, receivedAt: now - 45_000 }),
        makeAlert({ fingerprint: flappingFp, receivedAt: now - 40_000 }),
        // too short — removed
        makeAlert({ fingerprint: shortFp, receivedAt: now - 5_000 }),
        // valid — kept
        makeAlert({ fingerprint: goodFp, receivedAt: now - 60_000 }),
      ]

      const result = filterNoise(alerts, now, config)

      expect(result).toHaveLength(1)
      expect(result[0]!.fingerprint).toBe(goodFp)
    })
  })
})
