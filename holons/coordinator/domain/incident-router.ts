import { Effect } from "effect"
import type { IncidentStatus, HolonRole } from "@argos/shared"
import { INCIDENT_STATUS, HOLON_ROLES, InvalidTransition } from "@argos/shared"
import { canTransition, transition } from "@argos/blueprint-engine"

export interface RoutingDecision {
  readonly from: IncidentStatus
  readonly to: IncidentStatus
  readonly targetHolon: HolonRole
}

const stateToHolon: ReadonlyMap<IncidentStatus, HolonRole> = new Map([
  [INCIDENT_STATUS.DETECTED, HOLON_ROLES.SENTINEL],
  [INCIDENT_STATUS.DIAGNOSING, HOLON_ROLES.DIAGNOSTICIAN],
  [INCIDENT_STATUS.ASSESSING, HOLON_ROLES.HEALER],
  [INCIDENT_STATUS.HEALING, HOLON_ROLES.HEALER],
  [INCIDENT_STATUS.VERIFYING, HOLON_ROLES.HEALER],
  [INCIDENT_STATUS.RESOLVED, HOLON_ROLES.HISTORIAN],
  [INCIDENT_STATUS.ESCALATED, HOLON_ROLES.COORDINATOR],
])

export const routeIncident = (
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus,
): Effect.Effect<RoutingDecision, InvalidTransition> =>
  Effect.map(transition(currentStatus, targetStatus), (newStatus) => {
    const targetHolon = stateToHolon.get(newStatus) ?? HOLON_ROLES.COORDINATOR
    return {
      from: currentStatus,
      to: newStatus,
      targetHolon,
    }
  })

export const isValidTransition = (from: IncidentStatus, to: IncidentStatus): boolean =>
  canTransition(from, to)

export const getTargetHolon = (status: IncidentStatus): HolonRole =>
  stateToHolon.get(status) ?? HOLON_ROLES.COORDINATOR
