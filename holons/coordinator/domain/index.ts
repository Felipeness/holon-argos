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
