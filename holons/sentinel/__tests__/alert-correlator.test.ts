import { describe, it, expect } from "vitest"
import { AlertFingerprint } from "@orchestrix/shared"
import { SEVERITY } from "@orchestrix/shared"
import { correlateAlerts } from "../domain/alert-correlator.js"
import type { Alert } from "../domain/index.js"

const makeAlert = (overrides: Partial<Alert> = {}): Alert => ({
  fingerprint: AlertFingerprint(`fp-${Math.random().toString(36).slice(2, 8)}`),
  source: "prometheus",
  message: "high cpu usage",
  severity: SEVERITY.P3,
  labels: { service: "api-gateway", alertname: "HighCPU" },
  receivedAt: Date.now(),
  ...overrides,
})

describe("alert-correlator", () => {
  it("returns empty array for empty input", () => {
    const result = correlateAlerts([])
    expect(result).toEqual([])
  })

  it("groups alerts from the same service with same error type", () => {
    const now = Date.now()
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-1"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-2"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now + 1000,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-3"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now + 2000,
      }),
    ]

    const groups = correlateAlerts(alerts)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.alerts).toHaveLength(3)
    expect(groups[0]!.groupKey).toBe("api-gateway::HighCPU")
  })

  it("separates alerts from different services", () => {
    const now = Date.now()
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-1"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-2"),
        labels: { service: "payment-svc", alertname: "HighCPU" },
        receivedAt: now + 1000,
      }),
    ]

    const groups = correlateAlerts(alerts)

    expect(groups).toHaveLength(2)
    expect(groups[0]!.alerts).toHaveLength(1)
    expect(groups[1]!.alerts).toHaveLength(1)
  })

  it("separates alerts with different error types from same service", () => {
    const now = Date.now()
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-1"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-2"),
        labels: { service: "api-gateway", alertname: "HighMemory" },
        receivedAt: now + 1000,
      }),
    ]

    const groups = correlateAlerts(alerts)

    expect(groups).toHaveLength(2)
  })

  it("deduplicates alerts with same fingerprint", () => {
    const now = Date.now()
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-same"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-same"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now + 500,
      }),
    ]

    const groups = correlateAlerts(alerts)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.alerts).toHaveLength(1)
  })

  it("tracks firstSeenAt and lastSeenAt in groups", () => {
    const now = Date.now()
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-1"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-2"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now + 5000,
      }),
    ]

    const groups = correlateAlerts(alerts)

    expect(groups[0]!.firstSeenAt).toBe(now)
    expect(groups[0]!.lastSeenAt).toBe(now + 5000)
  })

  it("respects time window for grouping", () => {
    const now = Date.now()
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-1"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now,
      }),
      makeAlert({
        fingerprint: AlertFingerprint("fp-2"),
        labels: { service: "api-gateway", alertname: "HighCPU" },
        receivedAt: now + 500,
      }),
    ]

    const groups = correlateAlerts(alerts, { timeWindowMs: 1000 })

    expect(groups).toHaveLength(1)
    expect(groups[0]!.alerts).toHaveLength(2)
  })

  it("handles missing service label gracefully", () => {
    const alerts: Alert[] = [
      makeAlert({
        fingerprint: AlertFingerprint("fp-1"),
        labels: { alertname: "HighCPU" },
      }),
    ]

    const groups = correlateAlerts(alerts)

    expect(groups).toHaveLength(1)
    expect(groups[0]!.groupKey).toBe("unknown::HighCPU")
  })
})
