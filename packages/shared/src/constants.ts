export const SEVERITY = {
  P1: "P1",
  P2: "P2",
  P3: "P3",
  P4: "P4",
  P5: "P5",
} as const

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY]

export const INCIDENT_STATUS = {
  DETECTED: "DETECTED",
  DIAGNOSING: "DIAGNOSING",
  ASSESSING: "ASSESSING",
  HEALING: "HEALING",
  VERIFYING: "VERIFYING",
  RESOLVED: "RESOLVED",
  ESCALATED: "ESCALATED",
} as const

export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS]

export const ENTITY_TYPES = {
  SERVICE: "service",
  INCIDENT: "incident",
  ALERT: "alert",
  ROOT_CAUSE: "root_cause",
  FIX: "fix",
  RUNBOOK: "runbook",
  POSTMORTEM: "postmortem",
  TEAM: "team",
} as const

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES]

export const RELATION_TYPES = {
  CAUSED_BY: "caused_by",
  FIXED_BY: "fixed_by",
  SIMILAR_TO: "similar_to",
  RECURRED_AFTER: "recurred_after",
  AFFECTS: "affects",
  ESCALATED_TO: "escalated_to",
  DOCUMENTED_IN: "documented_in",
  USES_RUNBOOK: "uses_runbook",
} as const

export type RelationType = (typeof RELATION_TYPES)[keyof typeof RELATION_TYPES]

export const HOLON_ROLES = {
  SENTINEL: "sentinel",
  DIAGNOSTICIAN: "diagnostician",
  HEALER: "healer",
  HISTORIAN: "historian",
  COORDINATOR: "coordinator",
} as const

export type HolonRole = (typeof HOLON_ROLES)[keyof typeof HOLON_ROLES]
