import { describe, it, expect } from "vitest"
import { buildProjection } from "../src/projection.js"
import type { GraphEvent } from "../src/events.js"

describe("buildProjection", () => {
  it("returns empty projection for no events", () => {
    const result = buildProjection([])
    expect(result.entities.size).toBe(0)
    expect(result.relations.size).toBe(0)
  })

  it("adds entity on EntityCreated", () => {
    const events: GraphEvent[] = [
      {
        type: "EntityCreated",
        entityId: "e-1",
        entityType: "service",
        name: "api",
        metadata: { foo: "bar" },
        timestamp: 1000,
      },
    ]

    const result = buildProjection(events)
    expect(result.entities.size).toBe(1)
    const entity = result.entities.get("e-1")
    expect(entity?.name).toBe("api")
    expect(entity?.metadata).toEqual({ foo: "bar" })
  })

  it("merges metadata on EntityUpdated", () => {
    const events: GraphEvent[] = [
      {
        type: "EntityCreated",
        entityId: "e-1",
        entityType: "service",
        name: "api",
        metadata: { version: "1" },
        timestamp: 1000,
      },
      {
        type: "EntityUpdated",
        entityId: "e-1",
        metadata: { status: "healthy" },
        timestamp: 2000,
      },
    ]

    const result = buildProjection(events)
    const entity = result.entities.get("e-1")
    expect(entity?.metadata).toEqual({ version: "1", status: "healthy" })
    expect(entity?.updatedAt).toBe(2000)
  })

  it("removes entity on EntityDeleted", () => {
    const events: GraphEvent[] = [
      {
        type: "EntityCreated",
        entityId: "e-1",
        entityType: "service",
        name: "api",
        metadata: {},
        timestamp: 1000,
      },
      {
        type: "EntityDeleted",
        entityId: "e-1",
        timestamp: 2000,
      },
    ]

    const result = buildProjection(events)
    expect(result.entities.size).toBe(0)
  })

  it("adds relation on RelationCreated", () => {
    const events: GraphEvent[] = [
      {
        type: "RelationCreated",
        relationId: "r-1",
        relationType: "caused_by",
        fromEntityId: "e-1",
        toEntityId: "e-2",
        metadata: {},
        timestamp: 1000,
      },
    ]

    const result = buildProjection(events)
    expect(result.relations.size).toBe(1)
    const rel = result.relations.get("r-1")
    expect(rel?.type).toBe("caused_by")
  })

  it("removes relation on RelationDeleted", () => {
    const events: GraphEvent[] = [
      {
        type: "RelationCreated",
        relationId: "r-1",
        relationType: "caused_by",
        fromEntityId: "e-1",
        toEntityId: "e-2",
        metadata: {},
        timestamp: 1000,
      },
      {
        type: "RelationDeleted",
        relationId: "r-1",
        timestamp: 2000,
      },
    ]

    const result = buildProjection(events)
    expect(result.relations.size).toBe(0)
  })

  it("replays events in order to reconstruct state", () => {
    const events: GraphEvent[] = [
      {
        type: "EntityCreated",
        entityId: "svc-1",
        entityType: "service",
        name: "api",
        metadata: {},
        timestamp: 1000,
      },
      {
        type: "EntityCreated",
        entityId: "svc-2",
        entityType: "service",
        name: "worker",
        metadata: {},
        timestamp: 2000,
      },
      {
        type: "RelationCreated",
        relationId: "r-1",
        relationType: "affects",
        fromEntityId: "svc-1",
        toEntityId: "svc-2",
        metadata: {},
        timestamp: 3000,
      },
      {
        type: "EntityUpdated",
        entityId: "svc-1",
        metadata: { status: "degraded" },
        timestamp: 4000,
      },
    ]

    const result = buildProjection(events)
    expect(result.entities.size).toBe(2)
    expect(result.relations.size).toBe(1)
    expect(result.entities.get("svc-1")?.metadata).toEqual({ status: "degraded" })
  })
})
