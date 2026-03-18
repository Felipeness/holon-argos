import { describe, it, expect } from "vitest"
import { CorrelationId, HolonId } from "@argos/shared"
import {
  recordIncidentEvent,
  buildEventSequence,
  INCIDENT_EVENT_TYPES,
} from "../domain/incident-recorder.js"
import type { IncidentLifecycleEvent } from "../domain/incident-recorder.js"

const makeEvent = (overrides: Partial<IncidentLifecycleEvent> = {}): IncidentLifecycleEvent => ({
  incidentId: "inc-001",
  eventType: INCIDENT_EVENT_TYPES.DETECTED,
  correlationId: CorrelationId("corr-abc"),
  actorHolon: HolonId("sentinel"),
  timestamp: 1_700_000_000_000,
  metadata: {},
  ...overrides,
})

describe("incident-recorder", () => {
  describe("recordIncidentEvent", () => {
    it("creates entity and relation graph events", () => {
      const event = makeEvent()
      const graphEvents = recordIncidentEvent(event)

      expect(graphEvents).toHaveLength(2)
      expect(graphEvents[0]!.type).toBe("EntityCreated")
      expect(graphEvents[1]!.type).toBe("RelationCreated")
    })

    it("carries correlation ID in entity metadata", () => {
      const event = makeEvent({ correlationId: CorrelationId("corr-xyz") })
      const graphEvents = recordIncidentEvent(event)

      const entityEvent = graphEvents[0]!
      expect(entityEvent.type).toBe("EntityCreated")
      if (entityEvent.type === "EntityCreated") {
        expect(entityEvent.metadata["correlationId"]).toBe("corr-xyz")
      }
    })

    it("carries actor holon in entity metadata", () => {
      const event = makeEvent({ actorHolon: HolonId("diagnostician") })
      const graphEvents = recordIncidentEvent(event)

      const entityEvent = graphEvents[0]!
      if (entityEvent.type === "EntityCreated") {
        expect(entityEvent.metadata["actorHolon"]).toBe("diagnostician")
      }
    })

    it("carries correlation ID in relation metadata", () => {
      const event = makeEvent({ correlationId: CorrelationId("corr-rel") })
      const graphEvents = recordIncidentEvent(event)

      const relationEvent = graphEvents[1]!
      if (relationEvent.type === "RelationCreated") {
        expect(relationEvent.metadata["correlationId"]).toBe("corr-rel")
      }
    })

    it("links relation from incident to event entity", () => {
      const event = makeEvent({ incidentId: "inc-099" })
      const graphEvents = recordIncidentEvent(event)

      const relationEvent = graphEvents[1]!
      if (relationEvent.type === "RelationCreated") {
        expect(relationEvent.fromEntityId).toBe("inc-099")
        expect(relationEvent.toEntityId).toBe("event-inc-099-detected")
      }
    })

    it("preserves custom metadata", () => {
      const event = makeEvent({ metadata: { rootCause: "memory-leak", confidence: 0.95 } })
      const graphEvents = recordIncidentEvent(event)

      const entityEvent = graphEvents[0]!
      if (entityEvent.type === "EntityCreated") {
        expect(entityEvent.metadata["rootCause"]).toBe("memory-leak")
        expect(entityEvent.metadata["confidence"]).toBe(0.95)
      }
    })

    const eventTypeCases = [
      INCIDENT_EVENT_TYPES.DETECTED,
      INCIDENT_EVENT_TYPES.DIAGNOSED,
      INCIDENT_EVENT_TYPES.ASSESSMENT_COMPLETE,
      INCIDENT_EVENT_TYPES.REMEDIATION_STARTED,
      INCIDENT_EVENT_TYPES.REMEDIATION_COMPLETE,
      INCIDENT_EVENT_TYPES.VERIFIED,
      INCIDENT_EVENT_TYPES.RESOLVED,
    ] as const

    it.each(eventTypeCases)("records %s event type in entity name", (eventType) => {
      const event = makeEvent({ eventType })
      const graphEvents = recordIncidentEvent(event)

      const entityEvent = graphEvents[0]!
      if (entityEvent.type === "EntityCreated") {
        expect(entityEvent.name).toContain(eventType)
      }
    })
  })

  describe("buildEventSequence", () => {
    it("creates events in order with incrementing timestamps", () => {
      const sequence = buildEventSequence(
        "inc-001",
        CorrelationId("corr-seq"),
        HolonId("coordinator"),
        [INCIDENT_EVENT_TYPES.DETECTED, INCIDENT_EVENT_TYPES.DIAGNOSED, INCIDENT_EVENT_TYPES.RESOLVED],
        1_700_000_000_000,
      )

      expect(sequence).toHaveLength(3)
      expect(sequence[0]!.eventType).toBe("detected")
      expect(sequence[1]!.eventType).toBe("diagnosed")
      expect(sequence[2]!.eventType).toBe("resolved")
      expect(sequence[1]!.timestamp).toBeGreaterThan(sequence[0]!.timestamp)
      expect(sequence[2]!.timestamp).toBeGreaterThan(sequence[1]!.timestamp)
    })

    it("carries correlation ID on all events", () => {
      const sequence = buildEventSequence(
        "inc-002",
        CorrelationId("corr-all"),
        HolonId("sentinel"),
        [INCIDENT_EVENT_TYPES.DETECTED, INCIDENT_EVENT_TYPES.DIAGNOSED],
        1_700_000_000_000,
      )

      for (const event of sequence) {
        expect(event.correlationId).toBe("corr-all")
      }
    })
  })
})
