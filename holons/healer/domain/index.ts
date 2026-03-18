import { Context, Effect } from "effect"
import type { RemediationFailed, RollbackFailed } from "@argos/shared"
import type { RemediationPlan, RemediationStep, VerificationResult } from "@argos/temporal-workflows"

export interface HealerDomain {
  readonly buildPlan: (rootCause: string, serviceId: string) => Effect.Effect<RemediationPlan>
  readonly executeStep: (step: RemediationStep) => Effect.Effect<void, RemediationFailed>
  readonly rollback: (plan: RemediationPlan, failedAtStep: number) => Effect.Effect<void, RollbackFailed>
  readonly verify: (serviceId: string) => Effect.Effect<VerificationResult>
}

export class HealerService extends Context.Tag("HealerService")<
  HealerService,
  HealerDomain
>() {}

export { assessBlastRadius, RISK_LEVEL } from "./blast-radius.js"
export type { BlastRadiusAssessment, RiskLevel, ServiceGraph, ServiceNode, ServiceDependency } from "./blast-radius.js"

export { evaluateApproval, APPROVAL_DECISION } from "./approval-gate.js"
export type { ApprovalDecision, ApprovalDecisionType } from "./approval-gate.js"

export { buildRollbackPlan, RemediationStepError } from "./rollback-engine.js"
export type { RemediationAction, RollbackPlan } from "./rollback-engine.js"
