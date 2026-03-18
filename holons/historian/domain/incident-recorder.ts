import type { GraphEvent } from "@argos/graph-memory"
import type { CorrelationId, HolonId } from "@argos/shared"
import { ENTITY_TYPES, RELATION_TYPES } from "@argos/shared"

export const INCIDENT_EVENT_TYPES = {
  DETECTED: "detected",
  DIAGNOSED: "diagnosed",
  ASSESSMENT_COMPLETE: "assessment_complete",
  REMEDIATION_STARTED: "remediation_started",
  REMEDIATION_COMPLETE: "remediation_complete",
  VERIFIED: "verified",
  RESOLVED: "resolved",
} as const

export type IncidentEventType = (typeof INCIDENT_EVENT_TYPES)[keyof typeof INCIDENT_EVENT_TYPES]

export interface IncidentLifecycleEvent {
  readonly incidentId: string
  readonly eventType: IncidentEventType
  readonly correlationId: CorrelationId
  readonly actorHolon: HolonId
  readonly timestamp: number
  readonly metadata: Record<string, unknown>
}

export const recordIncidentEvent = (event: IncidentLifecycleEvent): readonly GraphEvent[] => {
  const eventEntityId = `event-${event.incidentId}-${event.eventType}`
  const relationId = `rel-${event.incidentId}-${event.eventType}`

  const entityCreated: GraphEvent = {
    type: "EntityCreated",
    entityId: eventEntityId,
    entityType: ENTITY_TYPES.INCIDENT,
    name: `${event.incidentId}:${event.eventType}`,
    metadata: {
      eventType: event.eventType,
      correlationId: event.correlationId,
      actorHolon: event.actorHolon,
      ...event.metadata,
    },
    timestamp: event.timestamp,
  }

  const relationCreated: GraphEvent = {
    type: "RelationCreated",
    relationId,
    relationType: RELATION_TYPES.DOCUMENTED_IN,
    fromEntityId: event.incidentId,
    toEntityId: eventEntityId,
    metadata: {
      eventType: event.eventType,
      correlationId: event.correlationId,
    },
    timestamp: event.timestamp,
  }

  return [entityCreated, relationCreated]
}

export const buildEventSequence = (
  incidentId: string,
  correlationId: CorrelationId,
  actorHolon: HolonId,
  eventTypes: readonly IncidentEventType[],
  baseTimestamp: number,
): readonly IncidentLifecycleEvent[] =>
  eventTypes.map((eventType, index) => ({
    incidentId,
    eventType,
    correlationId,
    actorHolon,
    timestamp: baseTimestamp + index * 1000,
    metadata: {},
  }))
