import { describe, it, expect } from "vitest"
import { rankHypotheses, EVIDENCE_TYPE, EVIDENCE_WEIGHT, type Evidence } from "../domain/hypothesis-ranker.js"
import type { Hypothesis } from "../domain/hypothesis-generator.js"

const makeHypothesis = (id: string, likelihood: number): Hypothesis => ({
  id,
  description: `Hypothesis ${id}`,
  likelihood,
  evidenceNeeded: ["check logs"],
})

describe("rankHypotheses", () => {
  it("boosts likelihood with supporting evidence", () => {
    const hypotheses = [makeHypothesis("h1", 0.5)]
    const evidence: readonly Evidence[] = [
      {
        hypothesisId: "h1",
        type: EVIDENCE_TYPE.SUPPORTING,
        weight: EVIDENCE_WEIGHT.STRONG,
        description: "Memory usage at 99%",
      },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)

    expect(ranked[0]!.adjustedLikelihood).toBeGreaterThan(0.5)
    expect(ranked[0]!.supportingEvidence).toHaveLength(1)
    expect(ranked[0]!.contradictingEvidence).toHaveLength(0)
  })

  it("decays likelihood with contradicting evidence", () => {
    const hypotheses = [makeHypothesis("h1", 0.8)]
    const evidence: readonly Evidence[] = [
      {
        hypothesisId: "h1",
        type: EVIDENCE_TYPE.CONTRADICTING,
        weight: EVIDENCE_WEIGHT.STRONG,
        description: "Memory usage normal at 30%",
      },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)

    expect(ranked[0]!.adjustedLikelihood).toBeLessThan(0.8)
    expect(ranked[0]!.contradictingEvidence).toHaveLength(1)
  })

  it("applies stronger adjustments for STRONG weight vs WEAK", () => {
    const hypotheses = [makeHypothesis("strong", 0.5), makeHypothesis("weak", 0.5)]
    const evidence: readonly Evidence[] = [
      {
        hypothesisId: "strong",
        type: EVIDENCE_TYPE.SUPPORTING,
        weight: EVIDENCE_WEIGHT.STRONG,
        description: "Definitive proof",
      },
      {
        hypothesisId: "weak",
        type: EVIDENCE_TYPE.SUPPORTING,
        weight: EVIDENCE_WEIGHT.WEAK,
        description: "Circumstantial evidence",
      },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)
    const strongRanked = ranked.find((h) => h.id === "strong")!
    const weakRanked = ranked.find((h) => h.id === "weak")!

    expect(strongRanked.adjustedLikelihood).toBeGreaterThan(weakRanked.adjustedLikelihood)
  })

  it("re-ranks hypotheses after evidence adjustment", () => {
    const hypotheses = [makeHypothesis("h1", 0.9), makeHypothesis("h2", 0.5)]
    const evidence: readonly Evidence[] = [
      {
        hypothesisId: "h1",
        type: EVIDENCE_TYPE.CONTRADICTING,
        weight: EVIDENCE_WEIGHT.STRONG,
        description: "Disproves h1",
      },
      {
        hypothesisId: "h1",
        type: EVIDENCE_TYPE.CONTRADICTING,
        weight: EVIDENCE_WEIGHT.STRONG,
        description: "Further disproves h1",
      },
      {
        hypothesisId: "h2",
        type: EVIDENCE_TYPE.SUPPORTING,
        weight: EVIDENCE_WEIGHT.STRONG,
        description: "Supports h2",
      },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)

    expect(ranked[0]!.id).toBe("h2")
    expect(ranked[0]!.adjustedLikelihood).toBeGreaterThan(ranked[1]!.adjustedLikelihood)
  })

  it("keeps likelihood unchanged when no evidence provided", () => {
    const hypotheses = [makeHypothesis("h1", 0.7)]

    const ranked = rankHypotheses(hypotheses, [])

    expect(ranked[0]!.adjustedLikelihood).toBe(0.7)
  })

  it("clamps likelihood between 0 and 1", () => {
    const hypotheses = [makeHypothesis("high", 0.99), makeHypothesis("low", 0.01)]
    const evidence: readonly Evidence[] = [
      { hypothesisId: "high", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.STRONG, description: "boost" },
      { hypothesisId: "high", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.STRONG, description: "boost2" },
      { hypothesisId: "high", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.STRONG, description: "boost3" },
      { hypothesisId: "low", type: EVIDENCE_TYPE.CONTRADICTING, weight: EVIDENCE_WEIGHT.STRONG, description: "drop" },
      { hypothesisId: "low", type: EVIDENCE_TYPE.CONTRADICTING, weight: EVIDENCE_WEIGHT.STRONG, description: "drop2" },
      { hypothesisId: "low", type: EVIDENCE_TYPE.CONTRADICTING, weight: EVIDENCE_WEIGHT.STRONG, description: "drop3" },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)
    const high = ranked.find((h) => h.id === "high")!
    const low = ranked.find((h) => h.id === "low")!

    expect(high.adjustedLikelihood).toBeLessThanOrEqual(1)
    expect(low.adjustedLikelihood).toBeGreaterThanOrEqual(0)
  })

  it("handles multiple evidence pieces cumulatively", () => {
    const hypotheses = [makeHypothesis("h1", 0.5)]
    const evidence: readonly Evidence[] = [
      { hypothesisId: "h1", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.MODERATE, description: "ev1" },
      { hypothesisId: "h1", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.MODERATE, description: "ev2" },
      { hypothesisId: "h1", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.MODERATE, description: "ev3" },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)

    expect(ranked[0]!.adjustedLikelihood).toBeGreaterThan(0.5)
    expect(ranked[0]!.supportingEvidence).toHaveLength(3)
  })

  it("ignores evidence for non-existent hypotheses", () => {
    const hypotheses = [makeHypothesis("h1", 0.6)]
    const evidence: readonly Evidence[] = [
      { hypothesisId: "h999", type: EVIDENCE_TYPE.SUPPORTING, weight: EVIDENCE_WEIGHT.STRONG, description: "orphan" },
    ]

    const ranked = rankHypotheses(hypotheses, evidence)

    expect(ranked[0]!.adjustedLikelihood).toBe(0.6)
  })
})
