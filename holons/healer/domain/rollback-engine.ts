import type { SagaStep } from "@argos/blueprint-engine"
import { Effect } from "effect"

export interface RemediationAction {
  readonly name: string
  readonly execute: () => Effect.Effect<string, RemediationStepError>
  readonly compensate: () => Effect.Effect<void, never>
}

export interface RemediationStepError {
  readonly _tag: "RemediationStepError"
  readonly step: string
  readonly reason: string
}

export interface RollbackPlan {
  readonly steps: readonly SagaStep<string, RemediationStepError>[]
  readonly totalSteps: number
}

export const RemediationStepError = (step: string, reason: string): RemediationStepError => ({
  _tag: "RemediationStepError",
  step,
  reason,
})

export const buildRollbackPlan = (
  actions: readonly RemediationAction[],
): RollbackPlan => {
  const steps = actions.map((action): SagaStep<string, RemediationStepError> => ({
    name: action.name,
    execute: action.execute(),
    compensate: action.compensate(),
  }))

  return {
    steps,
    totalSteps: actions.length,
  }
}
