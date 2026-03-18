import { describe, it, expect } from "vitest"
import { generateHypotheses, type IncidentData } from "../domain/hypothesis-generator.js"

const baseIncident: IncidentData = {
  serviceId: "svc-api",
  severity: "P2",
  alerts: [],
  metrics: [],
  errorMessages: [],
}

describe("generateHypotheses", () => {
  it("generates OOM hypothesis from error messages", () => {
    const data: IncidentData = {
      ...baseIncident,
      errorMessages: ["Container was OOMKilled after exceeding memory limit"],
    }

    const hypotheses = generateHypotheses(data)

    expect(hypotheses.length).toBeGreaterThanOrEqual(1)
    expect(hypotheses[0]!.id).toBe("oom-kill")
    expect(hypotheses[0]!.likelihood).toBeGreaterThan(0.5)
    expect(hypotheses[0]!.evidenceNeeded.length).toBeGreaterThan(0)
  })

  it("generates database hypothesis from connection pool errors", () => {
    const data: IncidentData = {
      ...baseIncident,
      errorMessages: ["connection pool exhausted, too many connections"],
    }

    const hypotheses = generateHypotheses(data)

    expect(hypotheses.some((h) => h.id === "db-connection-exhaustion")).toBe(true)
  })

  it("generates timeout hypothesis from alert signals", () => {
    const data: IncidentData = {
      ...baseIncident,
      alerts: [{ source: "prometheus", message: "High latency timeout detected", labels: {} }],
    }

    const hypotheses = generateHypotheses(data)

    expect(hypotheses.some((h) => h.id === "upstream-timeout")).toBe(true)
  })

  it("generates disk hypothesis from metric signals", () => {
    const data: IncidentData = {
      ...baseIncident,
      metrics: [{ name: "disk_usage_percent", value: 98, threshold: 90 }],
    }

    const hypotheses = generateHypotheses(data)

    expect(hypotheses.some((h) => h.id === "disk-pressure")).toBe(true)
  })

  it("returns empty when no patterns match", () => {
    const hypotheses = generateHypotheses(baseIncident)

    expect(hypotheses).toEqual([])
  })

  it("returns hypotheses sorted by likelihood descending", () => {
    const data: IncidentData = {
      ...baseIncident,
      errorMessages: ["OOMKilled", "connection pool exhausted", "timeout"],
    }

    const hypotheses = generateHypotheses(data)

    for (let i = 1; i < hypotheses.length; i++) {
      expect(hypotheses[i]!.likelihood).toBeLessThanOrEqual(hypotheses[i - 1]!.likelihood)
    }
  })

  it("boosts likelihood for high severity incidents", () => {
    const p1Data: IncidentData = { ...baseIncident, severity: "P1", errorMessages: ["timeout"] }
    const p5Data: IncidentData = { ...baseIncident, severity: "P5", errorMessages: ["timeout"] }

    const p1Hypotheses = generateHypotheses(p1Data)
    const p5Hypotheses = generateHypotheses(p5Data)

    expect(p1Hypotheses[0]!.likelihood).toBeGreaterThan(p5Hypotheses[0]!.likelihood)
  })

  it("generates multiple hypotheses from overlapping signals", () => {
    const data: IncidentData = {
      ...baseIncident,
      errorMessages: ["OOMKilled"],
      alerts: [{ source: "datadog", message: "memory limit exceeded", labels: {} }],
      metrics: [{ name: "cpu_usage", value: 95, threshold: 80 }],
    }

    const hypotheses = generateHypotheses(data)

    expect(hypotheses.length).toBeGreaterThanOrEqual(2)
  })

  it("generates certificate hypothesis", () => {
    const data: IncidentData = {
      ...baseIncident,
      errorMessages: ["CERT_HAS_EXPIRED: x509 certificate has expired"],
    }

    const hypotheses = generateHypotheses(data)

    expect(hypotheses[0]!.id).toBe("certificate-expiry")
    expect(hypotheses[0]!.likelihood).toBeGreaterThan(0.85)
  })
})
