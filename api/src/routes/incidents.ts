import { FastifyPluginAsync } from "fastify"
import { Effect } from "effect"
import { classifySeverity, SERVICE_TIER } from "../../../holons/sentinel/domain/severity-classifier.js"
import type { IncidentContext, ServiceTier } from "../../../holons/sentinel/domain/severity-classifier.js"
import { evaluateApproval } from "../../../holons/healer/domain/approval-gate.js"
import { RISK_LEVEL } from "../../../holons/healer/domain/blast-radius.js"
import type { RiskLevel } from "../../../holons/healer/domain/blast-radius.js"
import { getTargetHolon } from "../../../holons/coordinator/domain/incident-router.js"
import { INCIDENT_STATUS, SEVERITY } from "@argos/shared"
import type { Severity, IncidentStatus } from "@argos/shared"
import { processIncident } from "../../../packages/incident-pipeline/src/pipeline.js"

type IncidentParams = { id: string }

interface IncidentIntakeBody {
  readonly serviceId: string
  readonly serviceTier?: ServiceTier
  readonly userImpactPercent?: number
  readonly isServiceDown?: boolean
  readonly durationMs?: number
  readonly alerts?: readonly { source: string; message: string; labels: Record<string, string> }[]
  readonly metrics?: readonly { name: string; value: number; threshold: number }[]
  readonly errorMessages?: readonly string[]
}

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_request, _reply) => {
    return { incidents: [], total: 0, page: 1, limit: 20 }
  })

  app.get<{ Params: IncidentParams }>("/:id", async (request, _reply) => {
    const { id } = request.params
    return {
      id,
      status: INCIDENT_STATUS.DETECTED,
      severity: SEVERITY.P3,
      detected_at: new Date().toISOString(),
    }
  })

  app.post<{ Body: IncidentIntakeBody }>("/", async (request, reply) => {
    const body = request.body ?? {}
    const serviceId = body.serviceId ?? "unknown"

    const context: IncidentContext = {
      serviceTier: body.serviceTier ?? SERVICE_TIER.STANDARD,
      userImpactPercent: body.userImpactPercent ?? 0,
      isServiceDown: body.isServiceDown ?? false,
      durationMs: body.durationMs ?? 0,
    }

    const classification = classifySeverity(context)

    const targetHolon = getTargetHolon(INCIDENT_STATUS.DETECTED)

    const approval = evaluateApproval(classification.severity, RISK_LEVEL.LOW as RiskLevel)

    const pipelineResult = processIncident({
      incidentId: `inc-${Date.now()}`,
      serviceId,
      severity: classification.severity,
      alerts: (body.alerts ?? []).map((a) => ({ ...a })),
      metrics: (body.metrics ?? []).map((m) => ({ ...m })),
      errorMessages: [...(body.errorMessages ?? [])],
    })

    reply.status(202)
    return {
      accepted: true,
      incidentId: pipelineResult.incidentId,
      classification: {
        severity: classification.severity,
        autoRemediate: classification.autoRemediate,
        reason: classification.reason,
      },
      routing: {
        currentStatus: INCIDENT_STATUS.DETECTED,
        targetHolon,
      },
      approval: {
        decision: approval.decision,
        reason: approval.reason,
      },
      diagnosis: {
        hypotheses: pipelineResult.hypotheses.length,
        topHypothesis: pipelineResult.hypotheses[0] ?? null,
        runbooks: pipelineResult.runbooks.length,
      },
      timeline: {
        eventsRecorded: pipelineResult.eventsRecorded,
      },
    }
  })
}
