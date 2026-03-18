import { Context, Effect, Layer, Ref } from "effect"
import type { GraphEvent } from "./events.js"

export interface EventStore {
  readonly append: (event: GraphEvent) => Effect.Effect<void>
  readonly getAll: () => Effect.Effect<readonly GraphEvent[]>
  readonly getByEntityId: (entityId: string) => Effect.Effect<readonly GraphEvent[]>
  readonly getAfter: (timestamp: number) => Effect.Effect<readonly GraphEvent[]>
}

export class EventStoreService extends Context.Tag("EventStoreService")<
  EventStoreService,
  EventStore
>() {}

export const makeInMemoryEventStore = Effect.gen(function* () {
  const events = yield* Ref.make<readonly GraphEvent[]>([])

  return EventStoreService.of({
    append: (event) => Ref.update(events, (current) => [...current, event]),

    getAll: () => Ref.get(events),

    getByEntityId: (entityId) =>
      Effect.map(Ref.get(events), (all) =>
        all.filter((e) => {
          switch (e.type) {
            case "EntityCreated":
            case "EntityUpdated":
            case "EntityDeleted":
              return e.entityId === entityId
            case "RelationCreated":
              return e.fromEntityId === entityId || e.toEntityId === entityId
            case "RelationDeleted":
              return false
          }
        }),
      ),

    getAfter: (timestamp) =>
      Effect.map(Ref.get(events), (all) => all.filter((e) => e.timestamp > timestamp)),
  })
})

export const InMemoryEventStoreLayer = Layer.effect(EventStoreService, makeInMemoryEventStore)
