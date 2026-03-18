import { Effect } from "effect"
import type { IncidentStatus } from "@argos/shared"
import { INCIDENT_STATUS, InvalidTransition } from "@argos/shared"

type Status = IncidentStatus

const transitions: ReadonlyMap<Status, ReadonlySet<Status>> = new Map([
  [
    INCIDENT_STATUS.DETECTED,
    new Set<Status>([INCIDENT_STATUS.DIAGNOSING]),
  ],
  [
    INCIDENT_STATUS.DIAGNOSING,
    new Set<Status>([INCIDENT_STATUS.ASSESSING, INCIDENT_STATUS.ESCALATED]),
  ],
  [
    INCIDENT_STATUS.ASSESSING,
    new Set<Status>([INCIDENT_STATUS.HEALING, INCIDENT_STATUS.ESCALATED]),
  ],
  [
    INCIDENT_STATUS.HEALING,
    new Set<Status>([INCIDENT_STATUS.VERIFYING, INCIDENT_STATUS.ESCALATED]),
  ],
  [
    INCIDENT_STATUS.VERIFYING,
    new Set<Status>([INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.ESCALATED, INCIDENT_STATUS.HEALING]),
  ],
  [INCIDENT_STATUS.RESOLVED, new Set<Status>()],
  [INCIDENT_STATUS.ESCALATED, new Set<Status>()],
])

export const canTransition = (from: Status, to: Status): boolean => {
  const allowed = transitions.get(from)
  return allowed !== undefined && allowed.has(to)
}

export const transition = (
  from: Status,
  to: Status,
): Effect.Effect<Status, InvalidTransition> => {
  if (canTransition(from, to)) {
    return Effect.succeed(to)
  }
  return Effect.fail(new InvalidTransition({ from, to }))
}

export const validTransitionsFrom = (status: Status): readonly Status[] => {
  const allowed = transitions.get(status)
  return allowed ? Array.from(allowed) : []
}

export const isTerminal = (status: Status): boolean => {
  const allowed = transitions.get(status)
  return allowed !== undefined && allowed.size === 0
}
