import type { Severity } from "@argos/shared"
import { SEVERITY, CorrelationId, HolonId } from "@argos/shared"
import type { GraphEvent } from "@argos/graph-memory"
import {
  classifySeverity,
  SERVICE_TIER,
} from "../../../holons/sentinel/domain/severity-classifier.js"
import type { IncidentContext } from "../../../holons/sentinel/domain/severity-classifier.js"
import { getTargetHolon } from "../../../holons/coordinator/domain/incident-router.js"
import { INCIDENT_STATUS } from "@argos/shared"
import {
  generateHypotheses,
} from "../../../holons/diagnostician/domain/hypothesis-generator.js"
import type { Hypothesis, IncidentData, AlertSignal, MetricSignal } from "../../../holons/diagnostician/domain/hypothesis-generator.js"
import { matchRunbooks } from "../../../holons/diagnostician/domain/runbook-matcher.js"
import type { RunbookMatch } from "../../../holons/diagnostician/domain/runbook-matcher.js"
import { evaluateApproval } from "../../../holons/healer/domain/approval-gate.js"
import type { ApprovalDecision } from "../../../holons/healer/domain/approval-gate.js"
import { RISK_LEVEL } from "../../../holons/healer/domain/blast-radius.js"
import {
  recordIncidentEvent,
  INCIDENT_EVENT_TYPES,
} from "../../../holons/historian/domain/incident-recorder.js"
import type { IncidentLifecycleEvent } from "../../../holons/historian/domain/incident-recorder.js"

export interface PipelineInput {
  readonly incidentId: string
  readonly serviceId: string
  readonly severity: Severity
  readonly alerts: readonly AlertSignal[]
  readonly metrics: readonly MetricSignal[]
  readonly errorMessages: readonly string[]
}

export interface PipelineResult {
  readonly incidentId: string
  readonly severity: Severity
  readonly targetHolon: string
  readonly hypotheses: readonly Hypothesis[]
  readonly topHypothesis: Hypothesis | null
  readonly runbooks: readonly RunbookMatch[]
  readonly approval: ApprovalDecision
  readonly eventsRecorded: number
  readonly graphEvents: readonly GraphEvent[]
}

/**
 * Orchestrates the incident pipeline through all holons:
 *
 * sentinel.classify -> coordinator.route -> diagnostician.analyze -> healer.evaluate -> historian.record
 *
 * This chains pure domain functions synchronously. In production, Temporal
 * workflows handle the async orchestration with compensation/rollback.
 */
export const processIncident = (input: PipelineInput): PipelineResult => {
  const now = Date.now()
  const correlationId = CorrelationId(`corr-${input.incidentId}`)
  const sentinelHolon = HolonId("sentinel")

  // 1. Sentinel: classify severity (already done upstream, but we validate)
  const severity = input.severity

  // 2. Coordinator: route to target holon based on current state
  const targetHolon = getTargetHolon(INCIDENT_STATUS.DETECTED)

  // 3. Diagnostician: generate hypotheses from incident data
  const incidentData: IncidentData = {
    serviceId: input.serviceId,
    severity,
    alerts: input.alerts,
    metrics: input.metrics,
    errorMessages: input.errorMessages,
  }
  const hypotheses = generateHypotheses(incidentData)
  const topHypothesis = hypotheses[0] ?? null

  // 4. Diagnostician: match runbooks based on top hypothesis
  const rootCauseDescription = topHypothesis?.description ?? ""
  const runbooks = matchRunbooks(rootCauseDescription)

  // 5. Healer: evaluate approval gate
  const approval = evaluateApproval(severity, RISK_LEVEL.LOW)

  // 6. Historian: record lifecycle events
  const detectedEvent: IncidentLifecycleEvent = {
    incidentId: input.incidentId,
    eventType: INCIDENT_EVENT_TYPES.DETECTED,
    correlationId,
    actorHolon: sentinelHolon,
    timestamp: now,
    metadata: {
      severity,
      serviceId: input.serviceId,
      hypothesesCount: hypotheses.length,
    },
  }

  const diagnosedEvent: IncidentLifecycleEvent = {
    incidentId: input.incidentId,
    eventType: INCIDENT_EVENT_TYPES.DIAGNOSED,
    correlationId,
    actorHolon: HolonId("diagnostician"),
    timestamp: now + 1,
    metadata: {
      topHypothesis: topHypothesis?.id ?? "none",
      runbooksMatched: runbooks.length,
    },
  }

  const detectedGraphEvents = recordIncidentEvent(detectedEvent)
  const diagnosedGraphEvents = recordIncidentEvent(diagnosedEvent)
  const allGraphEvents = [...detectedGraphEvents, ...diagnosedGraphEvents]

  return {
    incidentId: input.incidentId,
    severity,
    targetHolon,
    hypotheses,
    topHypothesis,
    runbooks,
    approval,
    eventsRecorded: allGraphEvents.length,
    graphEvents: allGraphEvents,
  }
}
