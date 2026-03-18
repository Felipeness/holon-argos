import { Context, Effect } from "effect"
import type { DiagnosisFailed } from "@argos/shared"
import type { DiagnosisResult } from "@argos/temporal-workflows"

export interface DiagnosticContext {
  readonly incidentId: string
  readonly serviceId: string
  readonly alertFingerprint: string
  readonly symptoms: readonly string[]
}

export interface DiagnosticStrategy {
  readonly name: string
  readonly applicableWhen: (ctx: DiagnosticContext) => boolean
  readonly execute: (ctx: DiagnosticContext) => Effect.Effect<DiagnosisResult, DiagnosisFailed>
}

export interface DiagnosticianDomain {
  readonly diagnose: (ctx: DiagnosticContext) => Effect.Effect<DiagnosisResult, DiagnosisFailed>
  readonly findSimilarIncidents: (rootCause: string) => Effect.Effect<readonly string[]>
  readonly suggestRunbooks: (rootCause: string) => Effect.Effect<readonly string[]>
}

export class DiagnosticianService extends Context.Tag("DiagnosticianService")<
  DiagnosticianService,
  DiagnosticianDomain
>() {}

export { generateHypotheses } from "./hypothesis-generator.js"
export type { IncidentData, AlertSignal, MetricSignal, Hypothesis } from "./hypothesis-generator.js"

export { rankHypotheses, EVIDENCE_WEIGHT, EVIDENCE_TYPE } from "./hypothesis-ranker.js"
export type { Evidence, EvidenceWeight, EvidenceType, RankedHypothesis } from "./hypothesis-ranker.js"

export { matchRunbooks, RUNBOOK_CATEGORY } from "./runbook-matcher.js"
export type { RunbookEntry, RunbookMatch, RunbookCategory } from "./runbook-matcher.js"
