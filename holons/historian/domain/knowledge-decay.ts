import type { Relation } from "@argos/graph-memory"

const DECAY_FACTOR = 0.95
const MS_PER_DAY = 86_400_000

export interface DecayedRelation {
  readonly relation: Relation
  readonly originalWeight: number
  readonly decayedWeight: number
  readonly ageInDays: number
}

const getWeight = (relation: Relation): number =>
  typeof relation.metadata["weight"] === "number" ? relation.metadata["weight"] : 1.0

export const applyDecay = (relation: Relation, referenceTimestamp: number): DecayedRelation => {
  const ageMs = referenceTimestamp - relation.createdAt
  const ageInDays = Math.max(0, ageMs / MS_PER_DAY)
  const originalWeight = getWeight(relation)
  const decayedWeight = originalWeight * Math.pow(DECAY_FACTOR, ageInDays)

  return {
    relation,
    originalWeight,
    decayedWeight,
    ageInDays,
  }
}

export const applyDecayToAll = (
  relations: readonly Relation[],
  referenceTimestamp: number,
): readonly DecayedRelation[] =>
  relations.map((r) => applyDecay(r, referenceTimestamp))

export const filterByMinWeight = (
  decayed: readonly DecayedRelation[],
  minWeight: number,
): readonly DecayedRelation[] =>
  decayed.filter((d) => d.decayedWeight >= minWeight)

export const sortByWeight = (decayed: readonly DecayedRelation[]): readonly DecayedRelation[] =>
  [...decayed].sort((a, b) => b.decayedWeight - a.decayedWeight)
