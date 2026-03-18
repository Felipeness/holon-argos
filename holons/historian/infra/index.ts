// Infrastructure layer - graph memory queries, LLM for postmortem generation
export const STORAGE_BACKENDS = ["postgres", "graph_memory"] as const
export type StorageBackend = (typeof STORAGE_BACKENDS)[number]
