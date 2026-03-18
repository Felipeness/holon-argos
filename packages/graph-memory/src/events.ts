import type { EntityType, RelationType } from "@orchestrix/shared"

export type GraphEvent =
  | EntityCreated
  | EntityUpdated
  | EntityDeleted
  | RelationCreated
  | RelationDeleted

export interface EntityCreated {
  readonly type: "EntityCreated"
  readonly entityId: string
  readonly entityType: EntityType
  readonly name: string
  readonly metadata: Record<string, unknown>
  readonly timestamp: number
}

export interface EntityUpdated {
  readonly type: "EntityUpdated"
  readonly entityId: string
  readonly metadata: Record<string, unknown>
  readonly timestamp: number
}

export interface EntityDeleted {
  readonly type: "EntityDeleted"
  readonly entityId: string
  readonly timestamp: number
}

export interface RelationCreated {
  readonly type: "RelationCreated"
  readonly relationId: string
  readonly relationType: RelationType
  readonly fromEntityId: string
  readonly toEntityId: string
  readonly metadata: Record<string, unknown>
  readonly timestamp: number
}

export interface RelationDeleted {
  readonly type: "RelationDeleted"
  readonly relationId: string
  readonly timestamp: number
}
