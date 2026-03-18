import type { Entity, Relation } from "@argos/graph-memory"
import { ENTITY_TYPES, RELATION_TYPES } from "@argos/shared"

export interface PatternMatch {
  readonly incidentId: string
  readonly similarityScore: number
  readonly recurrenceIntervalMs: number | null
  readonly matchReasons: readonly string[]
}

interface IncidentData {
  readonly entity: Entity
  readonly serviceId: string | null
  readonly errorType: string | null
  readonly rootCause: string | null
}

const extractIncidentData = (
  entity: Entity,
  relations: readonly Relation[],
  entities: ReadonlyMap<string, Entity>,
): IncidentData => {
  const serviceRel = relations.find(
    (r) => r.type === RELATION_TYPES.AFFECTS && r.fromEntityId === entity.id,
  )
  const causeRel = relations.find(
    (r) => r.type === RELATION_TYPES.CAUSED_BY && r.fromEntityId === entity.id,
  )

  const serviceEntity = serviceRel ? entities.get(serviceRel.toEntityId) : undefined
  const causeEntity = causeRel ? entities.get(causeRel.toEntityId) : undefined

  return {
    entity,
    serviceId: serviceEntity?.id ?? null,
    errorType: (entity.metadata["errorType"] as string) ?? null,
    rootCause: causeEntity?.name ?? null,
  }
}

const calculateSimilarity = (current: IncidentData, past: IncidentData): { score: number; reasons: string[] } => {
  const reasons: string[] = []
  let score = 0

  if (current.serviceId && current.serviceId === past.serviceId) {
    score += 0.4
    reasons.push("same_service")
  }

  if (current.errorType && current.errorType === past.errorType) {
    score += 0.35
    reasons.push("same_error_type")
  }

  if (current.rootCause && current.rootCause === past.rootCause) {
    score += 0.25
    reasons.push("same_root_cause")
  }

  return { score, reasons }
}

export const detectPatterns = (
  currentIncidentId: string,
  entities: ReadonlyMap<string, Entity>,
  relations: readonly Relation[],
): readonly PatternMatch[] => {
  const currentEntity = entities.get(currentIncidentId)
  if (!currentEntity) {
    return []
  }

  const currentData = extractIncidentData(currentEntity, relations, entities)

  const pastIncidents = Array.from(entities.values())
    .filter((e) => e.type === ENTITY_TYPES.INCIDENT && e.id !== currentIncidentId)

  const matches: PatternMatch[] = []

  for (const pastEntity of pastIncidents) {
    const pastData = extractIncidentData(pastEntity, relations, entities)
    const { score, reasons } = calculateSimilarity(currentData, pastData)

    if (score <= 0) {
      continue
    }

    const recurrenceIntervalMs = currentEntity.createdAt - pastEntity.createdAt
    matches.push({
      incidentId: pastEntity.id,
      similarityScore: score,
      recurrenceIntervalMs: recurrenceIntervalMs > 0 ? recurrenceIntervalMs : null,
      matchReasons: reasons,
    })
  }

  return matches.sort((a, b) => b.similarityScore - a.similarityScore)
}
