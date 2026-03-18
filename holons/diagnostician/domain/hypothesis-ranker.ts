import type { Hypothesis } from "./hypothesis-generator.js"

export const EVIDENCE_WEIGHT = {
  STRONG: "STRONG",
  MODERATE: "MODERATE",
  WEAK: "WEAK",
} as const

export type EvidenceWeight = (typeof EVIDENCE_WEIGHT)[keyof typeof EVIDENCE_WEIGHT]

export const EVIDENCE_TYPE = {
  SUPPORTING: "SUPPORTING",
  CONTRADICTING: "CONTRADICTING",
} as const

export type EvidenceType = (typeof EVIDENCE_TYPE)[keyof typeof EVIDENCE_TYPE]

export interface Evidence {
  readonly hypothesisId: string
  readonly type: EvidenceType
  readonly weight: EvidenceWeight
  readonly description: string
}

export interface RankedHypothesis extends Hypothesis {
  readonly adjustedLikelihood: number
  readonly supportingEvidence: readonly Evidence[]
  readonly contradictingEvidence: readonly Evidence[]
}

const weightMultiplier = (weight: EvidenceWeight): number => {
  const multipliers: Record<EvidenceWeight, number> = {
    STRONG: 0.20,
    MODERATE: 0.10,
    WEAK: 0.05,
  }
  return multipliers[weight]
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

const computeAdjustedLikelihood = (
  baseLikelihood: number,
  evidence: readonly Evidence[],
): number => {
  let adjusted = baseLikelihood

  for (const e of evidence) {
    const delta = weightMultiplier(e.weight)
    adjusted = e.type === EVIDENCE_TYPE.SUPPORTING
      ? adjusted + delta * (1 - adjusted)
      : adjusted - delta * adjusted
  }

  return clamp(adjusted, 0, 1)
}

export const rankHypotheses = (
  hypotheses: readonly Hypothesis[],
  evidence: readonly Evidence[],
): readonly RankedHypothesis[] => {
  const ranked = hypotheses.map((hypothesis) => {
    const relatedEvidence = evidence.filter((e) => e.hypothesisId === hypothesis.id)
    const supporting = relatedEvidence.filter((e) => e.type === EVIDENCE_TYPE.SUPPORTING)
    const contradicting = relatedEvidence.filter((e) => e.type === EVIDENCE_TYPE.CONTRADICTING)

    return {
      ...hypothesis,
      adjustedLikelihood: computeAdjustedLikelihood(hypothesis.likelihood, relatedEvidence),
      supportingEvidence: supporting,
      contradictingEvidence: contradicting,
    }
  })

  return [...ranked].sort((a, b) => b.adjustedLikelihood - a.adjustedLikelihood)
}
