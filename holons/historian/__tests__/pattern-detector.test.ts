import { describe, it, expect } from "vitest"
import type { Entity, Relation } from "@argos/graph-memory"
import { ENTITY_TYPES, RELATION_TYPES } from "@argos/shared"
import { detectPatterns } from "../domain/pattern-detector.js"

const makeIncident = (id: string, createdAt: number, metadata: Record<string, unknown> = {}): Entity => ({
  id,
  type: ENTITY_TYPES.INCIDENT,
  name: `incident-${id}`,
  metadata,
  createdAt,
  updatedAt: createdAt,
})

const makeService = (id: string): Entity => ({
  id,
  type: ENTITY_TYPES.SERVICE,
  name: `service-${id}`,
  metadata: {},
  createdAt: 0,
  updatedAt: 0,
})

const makeRootCause = (id: string, name: string): Entity => ({
  id,
  type: ENTITY_TYPES.ROOT_CAUSE,
  name,
  metadata: {},
  createdAt: 0,
  updatedAt: 0,
})

const makeRelation = (id: string, type: string, from: string, to: string): Relation => ({
  id,
  type: type as Relation["type"],
  fromEntityId: from,
  toEntityId: to,
  metadata: {},
  createdAt: 0,
})

describe("pattern-detector", () => {
  it("finds incidents affecting the same service", () => {
    const entities = new Map<string, Entity>([
      ["inc-current", makeIncident("inc-current", 2000)],
      ["inc-past", makeIncident("inc-past", 1000)],
      ["svc-api", makeService("svc-api")],
    ])

    const relations: Relation[] = [
      makeRelation("r1", RELATION_TYPES.AFFECTS, "inc-current", "svc-api"),
      makeRelation("r2", RELATION_TYPES.AFFECTS, "inc-past", "svc-api"),
    ]

    const patterns = detectPatterns("inc-current", entities, relations)

    expect(patterns).toHaveLength(1)
    expect(patterns[0]!.incidentId).toBe("inc-past")
    expect(patterns[0]!.matchReasons).toContain("same_service")
    expect(patterns[0]!.similarityScore).toBeGreaterThan(0)
  })

  it("finds incidents with the same error type", () => {
    const entities = new Map<string, Entity>([
      ["inc-current", makeIncident("inc-current", 2000, { errorType: "OOMKilled" })],
      ["inc-past", makeIncident("inc-past", 1000, { errorType: "OOMKilled" })],
    ])

    const patterns = detectPatterns("inc-current", entities, [])

    expect(patterns).toHaveLength(1)
    expect(patterns[0]!.matchReasons).toContain("same_error_type")
  })

  it("finds incidents with the same root cause", () => {
    const entities = new Map<string, Entity>([
      ["inc-current", makeIncident("inc-current", 2000)],
      ["inc-past", makeIncident("inc-past", 1000)],
      ["rc-leak", makeRootCause("rc-leak", "memory-leak")],
    ])

    const relations: Relation[] = [
      makeRelation("r1", RELATION_TYPES.CAUSED_BY, "inc-current", "rc-leak"),
      makeRelation("r2", RELATION_TYPES.CAUSED_BY, "inc-past", "rc-leak"),
    ]

    const patterns = detectPatterns("inc-current", entities, relations)

    expect(patterns).toHaveLength(1)
    expect(patterns[0]!.matchReasons).toContain("same_root_cause")
  })

  it("calculates recurrence interval", () => {
    const entities = new Map<string, Entity>([
      ["inc-current", makeIncident("inc-current", 5000)],
      ["inc-past", makeIncident("inc-past", 2000, { errorType: "timeout" })],
    ])

    const currentWithError = makeIncident("inc-current", 5000, { errorType: "timeout" })
    entities.set("inc-current", currentWithError)

    const patterns = detectPatterns("inc-current", entities, [])

    expect(patterns).toHaveLength(1)
    expect(patterns[0]!.recurrenceIntervalMs).toBe(3000)
  })

  it("ranks matches by similarity score descending", () => {
    const entities = new Map<string, Entity>([
      ["inc-current", makeIncident("inc-current", 3000, { errorType: "OOMKilled" })],
      ["inc-low", makeIncident("inc-low", 1000, { errorType: "timeout" })],
      ["inc-high", makeIncident("inc-high", 2000, { errorType: "OOMKilled" })],
      ["svc-api", makeService("svc-api")],
    ])

    const relations: Relation[] = [
      makeRelation("r1", RELATION_TYPES.AFFECTS, "inc-current", "svc-api"),
      makeRelation("r2", RELATION_TYPES.AFFECTS, "inc-low", "svc-api"),
      makeRelation("r3", RELATION_TYPES.AFFECTS, "inc-high", "svc-api"),
    ]

    const patterns = detectPatterns("inc-current", entities, relations)

    expect(patterns).toHaveLength(2)
    expect(patterns[0]!.similarityScore).toBeGreaterThanOrEqual(patterns[1]!.similarityScore)
    expect(patterns[0]!.incidentId).toBe("inc-high")
  })

  it("returns empty array when no similar incidents exist", () => {
    const entities = new Map<string, Entity>([
      ["inc-current", makeIncident("inc-current", 1000)],
      ["inc-other", makeIncident("inc-other", 500)],
    ])

    const patterns = detectPatterns("inc-current", entities, [])

    expect(patterns).toHaveLength(0)
  })

  it("returns empty array when current incident not found", () => {
    const entities = new Map<string, Entity>()

    const patterns = detectPatterns("nonexistent", entities, [])

    expect(patterns).toHaveLength(0)
  })
})
