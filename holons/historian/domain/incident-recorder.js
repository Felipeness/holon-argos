import { ENTITY_TYPES, RELATION_TYPES } from "@argos/shared";
export const INCIDENT_EVENT_TYPES = {
    DETECTED: "detected",
    DIAGNOSED: "diagnosed",
    ASSESSMENT_COMPLETE: "assessment_complete",
    REMEDIATION_STARTED: "remediation_started",
    REMEDIATION_COMPLETE: "remediation_complete",
    VERIFIED: "verified",
    RESOLVED: "resolved",
};
export const recordIncidentEvent = (event) => {
    const eventEntityId = `event-${event.incidentId}-${event.eventType}`;
    const relationId = `rel-${event.incidentId}-${event.eventType}`;
    const entityCreated = {
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
    };
    const relationCreated = {
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
    };
    return [entityCreated, relationCreated];
};
export const buildEventSequence = (incidentId, correlationId, actorHolon, eventTypes, baseTimestamp) => eventTypes.map((eventType, index) => ({
    incidentId,
    eventType,
    correlationId,
    actorHolon,
    timestamp: baseTimestamp + index * 1000,
    metadata: {},
}));
//# sourceMappingURL=incident-recorder.js.map