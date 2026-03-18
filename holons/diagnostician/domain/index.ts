import { Context, Effect } from "effect"
import type { DiagnosisFailed } from "@orchestrix/shared"
import type { DiagnosisResult } from "@orchestrix/temporal-workflows"

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
