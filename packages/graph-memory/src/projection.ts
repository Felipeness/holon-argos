import { match } from "ts-pattern"
import type { GraphEvent } from "./events.js"
import type { Entity, Relation } from "./types.js"

export interface GraphProjection {
  readonly entities: ReadonlyMap<string, Entity>
  readonly relations: ReadonlyMap<string, Relation>
}

const emptyProjection: GraphProjection = {
  entities: new Map(),
  relations: new Map(),
}

const applyEvent = (state: GraphProjection, event: GraphEvent): GraphProjection => {
  const entities = new Map(state.entities)
  const relations = new Map(state.relations)

  match(event)
    .with({ type: "EntityCreated" }, (e) => {
      entities.set(e.entityId, {
        id: e.entityId,
        type: e.entityType,
        name: e.name,
        metadata: e.metadata,
        createdAt: e.timestamp,
        updatedAt: e.timestamp,
      })
    })
    .with({ type: "EntityUpdated" }, (e) => {
      const existing = entities.get(e.entityId)
      if (existing) {
        entities.set(e.entityId, {
          ...existing,
          metadata: { ...existing.metadata, ...e.metadata },
          updatedAt: e.timestamp,
        })
      }
    })
    .with({ type: "EntityDeleted" }, (e) => {
      entities.delete(e.entityId)
    })
    .with({ type: "RelationCreated" }, (e) => {
      relations.set(e.relationId, {
        id: e.relationId,
        type: e.relationType,
        fromEntityId: e.fromEntityId,
        toEntityId: e.toEntityId,
        metadata: e.metadata,
        createdAt: e.timestamp,
      })
    })
    .with({ type: "RelationDeleted" }, (e) => {
      relations.delete(e.relationId)
    })
    .exhaustive()

  return { entities, relations }
}

export const buildProjection = (events: readonly GraphEvent[]): GraphProjection =>
  events.reduce(applyEvent, emptyProjection)
