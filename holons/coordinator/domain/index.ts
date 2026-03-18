import { Context, Effect } from "effect"
import type { IncidentStatus, Severity } from "@orchestrix/shared"
import type { IncidentSagaState } from "@orchestrix/temporal-workflows"

export interface IncidentSummary {
  readonly incidentId: string
  readonly severity: Severity
  readonly status: IncidentStatus
  readonly serviceId: string
  readonly detectedAt: number
  readonly resolvedAt?: number
}

export interface CoordinatorDomain {
  readonly startIncidentSaga: (params: {
    alertFingerprint: string
    serviceId: string
    severity: Severity
  }) => Effect.Effect<string>

  readonly getIncidentState: (incidentId: string) => Effect.Effect<IncidentSagaState>

  readonly escalateIncident: (incidentId: string, reason: string) => Effect.Effect<void>

  readonly listActiveIncidents: () => Effect.Effect<readonly IncidentSummary[]>
}

export class CoordinatorService extends Context.Tag("CoordinatorService")<
  CoordinatorService,
  CoordinatorDomain
>() {}

export {
  routeIncident,
  isValidTransition,
  getTargetHolon,
} from "./incident-router.js"

export type { RoutingDecision } from "./incident-router.js"

export {
  evaluateEscalation,
  ESCALATION_TARGETS,
} from "./escalation-engine.js"

export type {
  EscalationDecision,
  EscalationTarget,
} from "./escalation-engine.js"

export {
  calculateSLAMetrics,
  calculateAllSeverities,
} from "./sla-tracker.js"

export type {
  IncidentTimestamp,
  SLAMetrics,
} from "./sla-tracker.js"
