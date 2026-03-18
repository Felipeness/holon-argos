import type { AlertFingerprint, Severity } from "@orchestrix/shared"

export const WEBHOOK_SOURCE = {
  PROMETHEUS: "prometheus",
  PAGERDUTY: "pagerduty",
  DATADOG: "datadog",
  SENTRY: "sentry",
  CUSTOM: "custom",
} as const

export type WebhookSource = (typeof WEBHOOK_SOURCE)[keyof typeof WEBHOOK_SOURCE]

export const WEBHOOK_STATUS = {
  FIRING: "firing",
  RESOLVED: "resolved",
} as const

export type WebhookStatus = (typeof WEBHOOK_STATUS)[keyof typeof WEBHOOK_STATUS]

export interface WebhookAlertPayload {
  readonly source: WebhookSource
  readonly fingerprint: string
  readonly status: WebhookStatus
  readonly severity: Severity
  readonly labels: Record<string, string>
  readonly annotations: Record<string, string>
  readonly startsAt: string
  readonly endsAt?: string
}

export interface PrometheusWebhookPayload {
  readonly version: string
  readonly status: WebhookStatus
  readonly alerts: readonly PrometheusAlert[]
}

export interface PrometheusAlert {
  readonly status: WebhookStatus
  readonly labels: Record<string, string>
  readonly annotations: Record<string, string>
  readonly startsAt: string
  readonly endsAt: string
  readonly fingerprint: string
}

export interface WebhookIntakeResult {
  readonly accepted: number
  readonly rejected: number
  readonly fingerprints: readonly AlertFingerprint[]
}

export interface WebhookIntakeRoute {
  readonly method: "POST"
  readonly url: string
  readonly handler: (payload: WebhookAlertPayload) => Promise<WebhookIntakeResult>
}

export interface WebhookIntakeRoutes {
  readonly generic: WebhookIntakeRoute
  readonly prometheus: {
    readonly method: "POST"
    readonly url: string
    readonly handler: (payload: PrometheusWebhookPayload) => Promise<WebhookIntakeResult>
  }
}
