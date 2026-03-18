import { Layer } from "effect"
import { PgClientLive } from "./pg-client.js"
import { PgEventStoreLayer } from "./live.js"
import { InMemoryEventStoreLayer } from "./event-store.js"
import { GraphMemoryLayer } from "./graph.js"

export const DEFAULT_PG_URL = "postgresql://argos:argos_dev@localhost:5432/argos"

export const getStorageLayers = (pgUrl?: string) => {
  if (pgUrl) {
    const pgLayer = PgClientLive(pgUrl)
    const eventStoreLayer = PgEventStoreLayer.pipe(Layer.provide(pgLayer))
    return {
      eventStore: eventStoreLayer,
      graphMemory: GraphMemoryLayer.pipe(Layer.provide(eventStoreLayer)),
    }
  }

  return {
    eventStore: InMemoryEventStoreLayer,
    graphMemory: GraphMemoryLayer.pipe(Layer.provide(InMemoryEventStoreLayer)),
  }
}
