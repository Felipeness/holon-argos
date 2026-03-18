export { EventStoreService, InMemoryEventStoreLayer } from "./event-store.js"
export { GraphMemoryService, GraphMemoryLayer } from "./graph.js"
export { buildProjection } from "./projection.js"

export type { GraphEvent } from "./events.js"
export type { Entity, Relation, GraphQuery, TraversalResult } from "./types.js"
export type { EventStore } from "./event-store.js"
export type { GraphMemory } from "./graph.js"
export type { GraphProjection } from "./projection.js"

export { PgClient, PgClientLive, PgError } from "./pg-client.js"
export type { PgClientService } from "./pg-client.js"

export { PgEventStoreLayer } from "./live.js"

export { getStorageLayers, DEFAULT_PG_URL } from "./detect-storage.js"
