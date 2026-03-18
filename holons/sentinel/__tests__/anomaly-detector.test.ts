import { describe, it, expect } from "vitest"
import { ServiceId } from "@argos/shared"
import {
  detectAnomaly,
  ANOMALY_STATUS,
  ANOMALY_SEVERITY,
  ANOMALY_TYPE,
  type MetricSample,
  type ThresholdConfig,
} from "../domain/anomaly-detector.js"

const makeSample = (overrides: Partial<MetricSample> = {}): MetricSample => ({
  serviceId: ServiceId("svc-api"),
  name: "cpu_usage",
  value: 50,
  timestamp: Date.now(),
  ...overrides,
})

const defaultConfig: ThresholdConfig = {
  max: 80,
  warning: 90,
  rateOfChangePercent: 50,
}

describe("anomaly-detector", () => {
  describe("static threshold", () => {
    it("returns normal when value is within threshold", () => {
      const sample = makeSample({ value: 50 })

      const result = detectAnomaly(sample, defaultConfig)

      expect(result.status).toBe(ANOMALY_STATUS.NORMAL)
      expect(result.type).toBeNull()
      expect(result.severity).toBeNull()
    })

    it("returns normal when value equals max threshold", () => {
      const sample = makeSample({ value: 80 })

      const result = detectAnomaly(sample, defaultConfig)

      expect(result.status).toBe(ANOMALY_STATUS.NORMAL)
    })

    it("detects threshold breach when value exceeds max", () => {
      const sample = makeSample({ value: 95 })

      const result = detectAnomaly(sample, defaultConfig)

      expect(result.status).toBe(ANOMALY_STATUS.DETECTED)
      expect(result.type).toBe(ANOMALY_TYPE.STATIC_THRESHOLD)
      expect(result.severity).not.toBeNull()
    })

    it("classifies as WARNING when value is at or below warning level", () => {
      const sample = makeSample({ value: 85 })
      const config: ThresholdConfig = { max: 80, warning: 90 }

      const result = detectAnomaly(sample, config)

      expect(result.severity).toBe(ANOMALY_SEVERITY.WARNING)
    })

    it("classifies as CRITICAL when value exceeds warning level", () => {
      const sample = makeSample({ value: 99 })
      const config: ThresholdConfig = { max: 80, warning: 90 }

      const result = detectAnomaly(sample, config)

      expect(result.severity).toBe(ANOMALY_SEVERITY.CRITICAL)
    })

    it("classifies as CRITICAL when no warning threshold is set", () => {
      const sample = makeSample({ value: 85 })
      const config: ThresholdConfig = { max: 80 }

      const result = detectAnomaly(sample, config)

      expect(result.severity).toBe(ANOMALY_SEVERITY.CRITICAL)
    })

    it("includes metric details in the result", () => {
      const sample = makeSample({ value: 95, name: "memory_usage" })

      const result = detectAnomaly(sample, defaultConfig)

      expect(result.metric).toBe(sample)
      expect(result.details).toContain("memory_usage")
      expect(result.details).toContain("95")
    })
  })

  describe("rate of change (spike detection)", () => {
    it("detects spike when rate exceeds threshold", () => {
      const previous = makeSample({ value: 20, timestamp: 1000 })
      const current = makeSample({ value: 70, timestamp: 2000 })
      const config: ThresholdConfig = { max: 100, rateOfChangePercent: 50 }

      const result = detectAnomaly(current, config, previous)

      expect(result.status).toBe(ANOMALY_STATUS.DETECTED)
      expect(result.type).toBe(ANOMALY_TYPE.RATE_OF_CHANGE)
    })

    it("returns normal when rate is within threshold", () => {
      const previous = makeSample({ value: 40, timestamp: 1000 })
      const current = makeSample({ value: 50, timestamp: 2000 })
      const config: ThresholdConfig = { max: 100, rateOfChangePercent: 50 }

      const result = detectAnomaly(current, config, previous)

      expect(result.status).toBe(ANOMALY_STATUS.NORMAL)
    })

    it("handles spike from zero", () => {
      const previous = makeSample({ value: 0, timestamp: 1000 })
      const current = makeSample({ value: 10, timestamp: 2000 })
      const config: ThresholdConfig = { max: 100, rateOfChangePercent: 50 }

      const result = detectAnomaly(current, config, previous)

      expect(result.status).toBe(ANOMALY_STATUS.DETECTED)
      expect(result.type).toBe(ANOMALY_TYPE.RATE_OF_CHANGE)
    })

    it("returns normal when both values are zero", () => {
      const previous = makeSample({ value: 0, timestamp: 1000 })
      const current = makeSample({ value: 0, timestamp: 2000 })
      const config: ThresholdConfig = { max: 100, rateOfChangePercent: 50 }

      const result = detectAnomaly(current, config, previous)

      expect(result.status).toBe(ANOMALY_STATUS.NORMAL)
    })

    it("ignores rate of change when no rateOfChangePercent configured", () => {
      const previous = makeSample({ value: 10, timestamp: 1000 })
      const current = makeSample({ value: 70, timestamp: 2000 })
      const config: ThresholdConfig = { max: 100 }

      const result = detectAnomaly(current, config, previous)

      expect(result.status).toBe(ANOMALY_STATUS.NORMAL)
    })

    it("classifies extreme spikes as CRITICAL", () => {
      const previous = makeSample({ value: 10, timestamp: 1000 })
      const current = makeSample({ value: 70, timestamp: 2000 })
      const config: ThresholdConfig = { max: 100, rateOfChangePercent: 20 }

      const result = detectAnomaly(current, config, previous)

      expect(result.severity).toBe(ANOMALY_SEVERITY.CRITICAL)
    })

    it("prioritizes static threshold over rate of change", () => {
      const previous = makeSample({ value: 70, timestamp: 1000 })
      const current = makeSample({ value: 95, timestamp: 2000 })

      const result = detectAnomaly(current, defaultConfig, previous)

      expect(result.type).toBe(ANOMALY_TYPE.STATIC_THRESHOLD)
    })
  })
})
