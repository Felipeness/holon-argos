import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { Effect, Layer } from "effect"
import { PgClient, PgClientLive } from "../src/pg-client.js"
import { PgEventStoreLayer } from "../src/live.js"
import { EventStoreService } from "../src/event-store.js"
import { GraphMemoryService, GraphMemoryLayer } from "../src/graph.js"
import type { EntityType, RelationType } from "@argos/shared"

const PG_URL = process.env.PG_URL ?? "postgresql://argos:argos_dev@localhost:5432/argos"

const pgLayer = PgClientLive(PG_URL)

const run = <A, E>(effect: Effect.Effect<A, E, PgClient>) =>
  Effect.runPromise(Effect.scoped(Effect.provide(effect, pgLayer)))

describe.skipIf(!process.env.PG_INTEGRATION)("Postgres live integration", () => {
  beforeAll(async () => {
    await run(
      Effect.gen(function* () {
        const pg = yield* PgClient
        yield* pg.query("DELETE FROM relations")
        yield* pg.query("DELETE FROM entities")
        yield* pg.query("DELETE FROM graph_events")
      }),
    )
  })

  afterAll(async () => {
    await run(
      Effect.gen(function* () {
        const pg = yield* PgClient
        yield* pg.query("DELETE FROM relations")
        yield* pg.query("DELETE FROM entities")
        yield* pg.query("DELETE FROM graph_events")
      }),
    )
  })

  it("EventStore: append and retrieve events", async () => {
    const eventLayer = PgEventStoreLayer.pipe(Layer.provide(pgLayer))

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const store = yield* EventStoreService

          yield* store.append({
            type: "EntityCreated",
            entityId: "ent-pg-1",
            entityType: "service" as EntityType,
            name: "Test Service",
            metadata: { env: "test" },
            timestamp: Date.now(),
          })

          const all = yield* store.getAll()
          expect(all.length).toBeGreaterThanOrEqual(1)

          const byEntity = yield* store.getByEntityId("ent-pg-1")
          expect(byEntity.length).toBeGreaterThanOrEqual(1)
          expect(byEntity[0].type).toBe("EntityCreated")
        }).pipe(Effect.provide(Layer.merge(eventLayer, pgLayer))),
      ),
    )
  })

  it("GraphMemory via Pg EventStore: create and query entity", async () => {
    const eventLayer = PgEventStoreLayer.pipe(Layer.provide(pgLayer))
    const graphLayer = GraphMemoryLayer.pipe(Layer.provide(eventLayer))
    const fullLayer = Layer.mergeAll(graphLayer, eventLayer, pgLayer)

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService

          const entity = yield* graph.createEntity({
            id: `ent-graph-${Date.now()}`,
            type: "service" as EntityType,
            name: "Graph Test Service",
            metadata: { version: 1 },
          })

          expect(entity.name).toBe("Graph Test Service")

          const found = yield* graph.getEntity(entity.id)
          expect(found.name).toBe("Graph Test Service")
        }).pipe(Effect.provide(fullLayer)),
      ),
    )
  })
})
