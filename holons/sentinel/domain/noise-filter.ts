import type { AlertFingerprint } from "@argos/shared"
import type { Alert } from "./index.js"

export interface NoiseFilterConfig {
  readonly flappingWindowMs: number
  readonly flappingThreshold: number
  readonly minimumDurationMs: number
}

const DEFAULT_NOISE_FILTER_CONFIG: NoiseFilterConfig = {
  flappingWindowMs: 300_000,
  flappingThreshold: 3,
  minimumDurationMs: 30_000,
}

interface AlertOccurrence {
  readonly fingerprint: AlertFingerprint
  readonly timestamps: readonly number[]
}

const buildOccurrenceMap = (alerts: readonly Alert[]): Map<AlertFingerprint, number[]> => {
  const occurrences = new Map<AlertFingerprint, number[]>()
  for (const alert of alerts) {
    const existing = occurrences.get(alert.fingerprint)
    if (existing) {
      existing.push(alert.receivedAt)
    } else {
      occurrences.set(alert.fingerprint, [alert.receivedAt])
    }
  }
  return occurrences
}

const isFlapping = (occurrence: AlertOccurrence, config: NoiseFilterConfig): boolean => {
  if (occurrence.timestamps.length < config.flappingThreshold) {
    return false
  }

  const sorted = [...occurrence.timestamps].sort((a, b) => a - b)
  const first = sorted[0]!
  const last = sorted[sorted.length - 1]!

  return last - first <= config.flappingWindowMs
}

const meetsMinimumDuration = (alert: Alert, now: number, config: NoiseFilterConfig): boolean =>
  now - alert.receivedAt >= config.minimumDurationMs

export const filterNoise = (
  alerts: readonly Alert[],
  now: number,
  config: NoiseFilterConfig = DEFAULT_NOISE_FILTER_CONFIG,
): readonly Alert[] => {
  if (alerts.length === 0) {
    return []
  }

  const occurrenceMap = buildOccurrenceMap(alerts)

  const flappingFingerprints = new Set<AlertFingerprint>()
  for (const [fingerprint, timestamps] of occurrenceMap) {
    if (isFlapping({ fingerprint, timestamps }, config)) {
      flappingFingerprints.add(fingerprint)
    }
  }

  const seen = new Set<AlertFingerprint>()

  return alerts.filter((alert) => {
    if (flappingFingerprints.has(alert.fingerprint)) {
      return false
    }

    if (seen.has(alert.fingerprint)) {
      return false
    }
    seen.add(alert.fingerprint)

    if (!meetsMinimumDuration(alert, now, config)) {
      return false
    }

    return true
  })
}
