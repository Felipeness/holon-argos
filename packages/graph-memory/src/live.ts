import { Effect, Layer } from "effect"
import { PgClient } from "./pg-client.js"
import { EventStoreService } from "./event-store.js"
import type { GraphEvent } from "./events.js"

export const PgEventStoreLayer = Layer.effect(
  EventStoreService,
  Effect.gen(function* () {
    const pg = yield* PgClient

    return EventStoreService.of({
      append: (event) =>
        Effect.gen(function* () {
          const entityId = extractEntityId(event)
          const relationId = extractRelationId(event)

          yield* pg.query(
            `INSERT INTO graph_events (event_type, entity_id, relation_id, payload, timestamp)
             VALUES ($1, $2, $3, $4, to_timestamp($5::double precision / 1000))`,
            [event.type, entityId, relationId, JSON.stringify(event), event.timestamp],
          )
        }),

      getAll: () =>
        Effect.gen(function* () {
          const result = yield* pg.query(
            `SELECT payload FROM graph_events ORDER BY id ASC`,
          )
          return result.rows.map((r) => r.payload as GraphEvent)
        }),

      getByEntityId: (entityId) =>
        Effect.gen(function* () {
          const result = yield* pg.query(
            `SELECT payload FROM graph_events WHERE entity_id = $1 ORDER BY id ASC`,
            [entityId],
          )
          return result.rows.map((r) => r.payload as GraphEvent)
        }),

      getAfter: (timestamp) =>
        Effect.gen(function* () {
          const result = yield* pg.query(
            `SELECT payload FROM graph_events WHERE timestamp > to_timestamp($1::double precision / 1000) ORDER BY id ASC`,
            [timestamp],
          )
          return result.rows.map((r) => r.payload as GraphEvent)
        }),
    })
  }),
)

const extractEntityId = (event: GraphEvent): string | null => {
  switch (event.type) {
    case "EntityCreated":
    case "EntityUpdated":
    case "EntityDeleted":
      return event.entityId
    case "RelationCreated":
      return event.fromEntityId
    case "RelationDeleted":
      return null
  }
}

const extractRelationId = (event: GraphEvent): string | null => {
  switch (event.type) {
    case "RelationCreated":
      return event.relationId
    case "RelationDeleted":
      return event.relationId
    default:
      return null
  }
}
