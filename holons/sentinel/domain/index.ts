import { Context, Effect } from "effect"
import type { AlertFingerprint, Severity } from "@orchestrix/shared"

export interface Alert {
  readonly fingerprint: AlertFingerprint
  readonly source: string
  readonly message: string
  readonly severity: Severity
  readonly labels: Record<string, string>
  readonly receivedAt: number
}

export interface AlertCorrelation {
  readonly groupKey: string
  readonly alerts: readonly Alert[]
  readonly severity: Severity
  readonly firstSeenAt: number
}

export interface SentinelDomain {
  readonly ingestAlert: (alert: Alert) => Effect.Effect<void>
  readonly correlateAlerts: (fingerprint: AlertFingerprint) => Effect.Effect<AlertCorrelation>
  readonly deduplicateAlert: (alert: Alert) => Effect.Effect<boolean>
}

export class SentinelService extends Context.Tag("SentinelService")<
  SentinelService,
  SentinelDomain
>() {}

export { detectAnomaly, ANOMALY_STATUS, ANOMALY_SEVERITY, ANOMALY_TYPE } from "./anomaly-detector.js"
export type {
  AnomalyResult,
  AnomalyStatus,
  AnomalySeverity,
  AnomalyType,
  ThresholdConfig,
  MetricSample,
} from "./anomaly-detector.js"

export { correlateAlerts } from "./alert-correlator.js"
export type { CorrelatedAlertGroup } from "./alert-correlator.js"

export { filterNoise } from "./noise-filter.js"
export type { NoiseFilterConfig } from "./noise-filter.js"

export { classifySeverity, SERVICE_TIER } from "./severity-classifier.js"
export type { ServiceTier, IncidentContext, SeverityClassification } from "./severity-classifier.js"
