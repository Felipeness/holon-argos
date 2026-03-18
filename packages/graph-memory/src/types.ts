import type { EntityType, RelationType } from "@orchestrix/shared"

export interface Entity {
  readonly id: string
  readonly type: EntityType
  readonly name: string
  readonly metadata: Record<string, unknown>
  readonly createdAt: number
  readonly updatedAt: number
}

export interface Relation {
  readonly id: string
  readonly type: RelationType
  readonly fromEntityId: string
  readonly toEntityId: string
  readonly metadata: Record<string, unknown>
  readonly createdAt: number
}

export interface GraphQuery {
  readonly entityType?: EntityType
  readonly relationType?: RelationType
  readonly fromEntityId?: string
  readonly toEntityId?: string
  readonly namePattern?: string
  readonly limit?: number
}

export interface TraversalResult {
  readonly entity: Entity
  readonly depth: number
  readonly path: readonly string[]
}
