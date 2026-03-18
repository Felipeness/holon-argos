import { FastifyPluginAsync } from "fastify"
import { AlertFingerprint, SEVERITY } from "@argos/shared"
import type { Severity } from "@argos/shared"
import { classifySeverity, SERVICE_TIER } from "../../../holons/sentinel/domain/severity-classifier.js"
import type { IncidentContext, ServiceTier } from "../../../holons/sentinel/domain/severity-classifier.js"
import { correlateAlerts } from "../../../holons/sentinel/domain/alert-correlator.js"
import { filterNoise } from "../../../holons/sentinel/domain/noise-filter.js"
import type { Alert } from "../../../holons/sentinel/domain/index.js"

// Prometheus AlertManager webhook format
// https://prometheus.io/docs/alerting/latest/configuration/#webhook_config
interface PrometheusAlert {
  readonly status: "firing" | "resolved"
  readonly labels: Record<string, string>
  readonly annotations: Record<string, string>
  readonly startsAt: string
  readonly endsAt: string
  readonly generatorURL?: string
  readonly fingerprint: string
}

interface PrometheusWebhookPayload {
  readonly version: string
  readonly groupKey?: string
  readonly truncatedAlerts?: number
  readonly status: "firing" | "resolved"
  readonly receiver?: string
  readonly groupLabels?: Record<string, string>
  readonly commonLabels?: Record<string, string>
  readonly commonAnnotations?: Record<string, string>
  readonly externalURL?: string
  readonly alerts: readonly PrometheusAlert[]
}

// PagerDuty webhook format (v3)
interface PagerDutyWebhookPayload {
  readonly event: {
    readonly id: string
    readonly event_type:
      | "incident.triggered"
      | "incident.acknowledged"
      | "incident.resolved"
      | "incident.escalated"
    readonly resource_type: "incident"
    readonly occurred_at: string
    readonly data: {
      readonly id: string
      readonly type: "incident"
      readonly title: string
      readonly status: string
      readonly urgency: "high" | "low"
      readonly service: { readonly id: string; readonly name: string }
      readonly priority?: { readonly id: string; readonly name: string }
      readonly description?: string
    }
  }
}

const prometheusAlertToInternal = (alert: PrometheusAlert, now: number): Alert => ({
  fingerprint: AlertFingerprint(alert.fingerprint),
  source: "prometheus",
  message:
    alert.annotations?.summary ??
    alert.annotations?.description ??
    alert.labels?.alertname ??
    "unknown alert",
  severity: mapPrometheusSeverity(alert.labels?.severity),
  labels: alert.labels ?? {},
  receivedAt: alert.startsAt ? new Date(alert.startsAt).getTime() : now,
})

const mapPrometheusSeverity = (severity: string | undefined): Severity => {
  const severityMap: Record<string, Severity> = {
    critical: SEVERITY.P1,
    error: SEVERITY.P2,
    warning: SEVERITY.P3,
    info: SEVERITY.P4,
  }
  return severityMap[severity ?? "warning"] ?? SEVERITY.P3
}

const mapServiceTier = (tierLabel: string | undefined): ServiceTier => {
  if (tierLabel === "critical") return SERVICE_TIER.CRITICAL
  if (tierLabel === "internal") return SERVICE_TIER.INTERNAL
  return SERVICE_TIER.STANDARD
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: PrometheusWebhookPayload }>("/prometheus", async (request, reply) => {
    const webhook = request.body

    if (!webhook.alerts || webhook.alerts.length === 0) {
      return reply.status(400).send({ error: "no alerts in webhook payload" })
    }

    const now = Date.now()

    const firingAlerts = webhook.alerts.filter((a) => a.status === "firing")

    if (firingAlerts.length === 0) {
      return { processed: 0, filtered: 0, groups: 0, classifications: [] }
    }

    const internalAlerts = firingAlerts.map((a) => prometheusAlertToInternal(a, now))

    const filtered = filterNoise(internalAlerts, now, {
      flappingWindowMs: 300_000,
      flappingThreshold: 3,
      minimumDurationMs: 0, // accept all durations from external webhooks — AlertManager already handles pending
    })

    const correlated = correlateAlerts(filtered)

    const classifications = correlated.map((group) => {
      const representative = group.alerts[0]!
      const serviceName =
        representative.labels["service"] ?? representative.labels["job"] ?? "unknown"

      const classification = classifySeverity({
        serviceTier: mapServiceTier(representative.labels["tier"]),
        userImpactPercent: parseInt(representative.labels["impact"] ?? "10", 10),
        isServiceDown: representative.severity === SEVERITY.P1,
        durationMs: now - group.firstSeenAt,
      })

      return {
        groupKey: group.groupKey,
        service: serviceName,
        alertCount: group.alerts.length,
        severity: classification.severity,
        autoRemediate: classification.autoRemediate,
        reason: classification.reason,
      }
    })

    return {
      processed: firingAlerts.length,
      filtered: filtered.length,
      groups: correlated.length,
      classifications,
    }
  })

  app.post<{ Body: PagerDutyWebhookPayload }>("/pagerduty", async (request, reply) => {
    const webhook = request.body

    if (!webhook.event) {
      return reply.status(400).send({ error: "invalid PagerDuty webhook format" })
    }

    const { event } = webhook
    const incident = event.data

    if (event.event_type !== "incident.triggered") {
      return { processed: false, reason: `ignoring event type: ${event.event_type}` }
    }

    const classification = classifySeverity({
      serviceTier: incident.urgency === "high" ? SERVICE_TIER.CRITICAL : SERVICE_TIER.STANDARD,
      userImpactPercent: incident.urgency === "high" ? 30 : 0,
      isServiceDown: incident.urgency === "high",
      durationMs: 60_000,
    })

    return {
      processed: true,
      incidentId: incident.id,
      title: incident.title,
      service: incident.service?.name,
      severity: classification.severity,
      autoRemediate: classification.autoRemediate,
      reason: classification.reason,
    }
  })
}
