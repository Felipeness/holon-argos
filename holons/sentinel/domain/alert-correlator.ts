import type { AlertFingerprint } from "@orchestrix/shared"
import type { Alert } from "./index.js"

export interface CorrelatedAlertGroup {
  readonly groupKey: string
  readonly alerts: readonly Alert[]
  readonly firstSeenAt: number
  readonly lastSeenAt: number
}

interface CorrelationConfig {
  readonly timeWindowMs: number
}

const DEFAULT_CORRELATION_CONFIG: CorrelationConfig = {
  timeWindowMs: 300_000,
}

const groupKey = (serviceLabel: string, errorType: string): string =>
  `${serviceLabel}::${errorType}`

const extractService = (alert: Alert): string =>
  alert.labels["service"] ?? "unknown"

const extractErrorType = (alert: Alert): string =>
  alert.labels["alertname"] ?? alert.labels["error_type"] ?? "generic"

const isWithinTimeWindow = (a: number, b: number, windowMs: number): boolean =>
  Math.abs(a - b) <= windowMs

export const correlateAlerts = (
  alerts: readonly Alert[],
  config: CorrelationConfig = DEFAULT_CORRELATION_CONFIG,
): readonly CorrelatedAlertGroup[] => {
  if (alerts.length === 0) {
    return []
  }

  const groups = new Map<string, Alert[]>()
  const seenFingerprints = new Set<AlertFingerprint>()

  const sorted = [...alerts].sort((a, b) => a.receivedAt - b.receivedAt)

  for (const alert of sorted) {
    if (seenFingerprints.has(alert.fingerprint)) {
      continue
    }
    seenFingerprints.add(alert.fingerprint)

    const service = extractService(alert)
    const errorType = extractErrorType(alert)
    const key = groupKey(service, errorType)

    const existing = groups.get(key)
    if (existing) {
      const referenceTime = existing[0]!.receivedAt
      if (isWithinTimeWindow(alert.receivedAt, referenceTime, config.timeWindowMs)) {
        existing.push(alert)
        continue
      }
    }

    groups.set(key, [alert])
  }

  return [...groups.entries()].map(([key, groupAlerts]) => ({
    groupKey: key,
    alerts: groupAlerts,
    firstSeenAt: groupAlerts[0]!.receivedAt,
    lastSeenAt: groupAlerts[groupAlerts.length - 1]!.receivedAt,
  }))
}
