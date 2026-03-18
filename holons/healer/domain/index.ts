import { Context, Effect } from "effect"
import type { RemediationFailed, RollbackFailed } from "@orchestrix/shared"
import type { RemediationPlan, RemediationStep, VerificationResult } from "@orchestrix/temporal-workflows"

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
