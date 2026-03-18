import { Context, Effect, Layer } from "effect"
import type { EntityType, RelationType } from "@argos/shared"
import { EntityNotFound, DuplicateEntity } from "@argos/shared"
import { EventStoreService } from "./event-store.js"
import { buildProjection } from "./projection.js"
import type { Entity, Relation, GraphQuery, TraversalResult } from "./types.js"

export interface GraphMemory {
  readonly createEntity: (params: {
    id: string
    type: EntityType
    name: string
    metadata?: Record<string, unknown>
  }) => Effect.Effect<Entity, DuplicateEntity>

  readonly updateEntity: (params: {
    id: string
    metadata: Record<string, unknown>
  }) => Effect.Effect<Entity, EntityNotFound>

  readonly deleteEntity: (id: string) => Effect.Effect<void, EntityNotFound>

  readonly getEntity: (id: string) => Effect.Effect<Entity, EntityNotFound>

  readonly createRelation: (params: {
    id: string
    type: RelationType
    fromEntityId: string
    toEntityId: string
    metadata?: Record<string, unknown>
  }) => Effect.Effect<Relation, EntityNotFound>

  readonly deleteRelation: (id: string) => Effect.Effect<void>

  readonly queryEntities: (query: GraphQuery) => Effect.Effect<readonly Entity[]>

  readonly queryRelations: (query: GraphQuery) => Effect.Effect<readonly Relation[]>

  readonly traverse: (params: {
    startEntityId: string
    relationType?: RelationType
    maxDepth: number
    direction?: "outbound" | "inbound" | "both"
  }) => Effect.Effect<readonly TraversalResult[], EntityNotFound>
}

export class GraphMemoryService extends Context.Tag("GraphMemoryService")<
  GraphMemoryService,
  GraphMemory
>() {}

const now = () => Date.now()

export const makeGraphMemory = Effect.gen(function* () {
  const store = yield* EventStoreService

  const getProjection = () => Effect.map(store.getAll(), buildProjection)

  return GraphMemoryService.of({
    createEntity: ({ id, type, name, metadata = {} }) =>
      Effect.gen(function* () {
        const projection = yield* getProjection()
        if (projection.entities.has(id)) {
          return yield* new DuplicateEntity({ id })
        }
        const timestamp = now()
        yield* store.append({
          type: "EntityCreated",
          entityId: id,
          entityType: type,
          name,
          metadata,
          timestamp,
        })
        return {
          id,
          type,
          name,
          metadata,
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      }),

    updateEntity: ({ id, metadata }) =>
      Effect.gen(function* () {
        const projection = yield* getProjection()
        const existing = projection.entities.get(id)
        if (!existing) {
          return yield* new EntityNotFound({ id })
        }
        const timestamp = now()
        yield* store.append({
          type: "EntityUpdated",
          entityId: id,
          metadata,
          timestamp,
        })
        return {
          ...existing,
          metadata: { ...existing.metadata, ...metadata },
          updatedAt: timestamp,
        }
      }),

    deleteEntity: (id) =>
      Effect.gen(function* () {
        const projection = yield* getProjection()
        if (!projection.entities.has(id)) {
          return yield* new EntityNotFound({ id })
        }
        yield* store.append({
          type: "EntityDeleted",
          entityId: id,
          timestamp: now(),
        })
      }),

    getEntity: (id) =>
      Effect.gen(function* () {
        const projection = yield* getProjection()
        const entity = projection.entities.get(id)
        if (!entity) {
          return yield* new EntityNotFound({ id })
        }
        return entity
      }),

    createRelation: ({ id, type, fromEntityId, toEntityId, metadata = {} }) =>
      Effect.gen(function* () {
        const projection = yield* getProjection()
        if (!projection.entities.has(fromEntityId)) {
          return yield* new EntityNotFound({ id: fromEntityId })
        }
        if (!projection.entities.has(toEntityId)) {
          return yield* new EntityNotFound({ id: toEntityId })
        }
        const timestamp = now()
        yield* store.append({
          type: "RelationCreated",
          relationId: id,
          relationType: type,
          fromEntityId,
          toEntityId,
          metadata,
          timestamp,
        })
        return { id, type, fromEntityId, toEntityId, metadata, createdAt: timestamp }
      }),

    deleteRelation: (id) =>
      store.append({
        type: "RelationDeleted",
        relationId: id,
        timestamp: now(),
      }),

    queryEntities: (query) =>
      Effect.map(getProjection(), (projection) => {
        let results = Array.from(projection.entities.values())

        if (query.entityType) {
          results = results.filter((e) => e.type === query.entityType)
        }
        if (query.namePattern) {
          const pattern = new RegExp(query.namePattern, "i")
          results = results.filter((e) => pattern.test(e.name))
        }
        if (query.limit) {
          results = results.slice(0, query.limit)
        }

        return results
      }),

    queryRelations: (query) =>
      Effect.map(getProjection(), (projection) => {
        let results = Array.from(projection.relations.values())

        if (query.relationType) {
          results = results.filter((r) => r.type === query.relationType)
        }
        if (query.fromEntityId) {
          results = results.filter((r) => r.fromEntityId === query.fromEntityId)
        }
        if (query.toEntityId) {
          results = results.filter((r) => r.toEntityId === query.toEntityId)
        }
        if (query.limit) {
          results = results.slice(0, query.limit)
        }

        return results
      }),

    traverse: ({ startEntityId, relationType, maxDepth, direction = "outbound" }) =>
      Effect.gen(function* () {
        const projection = yield* getProjection()
        if (!projection.entities.has(startEntityId)) {
          return yield* new EntityNotFound({ id: startEntityId })
        }

        const visited = new Set<string>()
        const results: TraversalResult[] = []
        const queue: Array<{ entityId: string; depth: number; path: string[] }> = [
          { entityId: startEntityId, depth: 0, path: [startEntityId] },
        ]

        while (queue.length > 0) {
          const current = queue.shift()!
          if (visited.has(current.entityId) || current.depth > maxDepth) {
            continue
          }
          visited.add(current.entityId)

          const entity = projection.entities.get(current.entityId)
          if (entity) {
            results.push({
              entity,
              depth: current.depth,
              path: current.path,
            })
          }

          if (current.depth < maxDepth) {
            const relations = Array.from(projection.relations.values())
            for (const rel of relations) {
              if (relationType && rel.type !== relationType) continue

              let nextId: string | undefined
              if (direction === "outbound" && rel.fromEntityId === current.entityId) {
                nextId = rel.toEntityId
              } else if (direction === "inbound" && rel.toEntityId === current.entityId) {
                nextId = rel.fromEntityId
              } else if (direction === "both") {
                if (rel.fromEntityId === current.entityId) nextId = rel.toEntityId
                else if (rel.toEntityId === current.entityId) nextId = rel.fromEntityId
              }

              if (nextId && !visited.has(nextId)) {
                queue.push({
                  entityId: nextId,
                  depth: current.depth + 1,
                  path: [...current.path, nextId],
                })
              }
            }
          }
        }

        return results
      }),
  })
})

export const GraphMemoryLayer = Layer.effect(GraphMemoryService, makeGraphMemory)
