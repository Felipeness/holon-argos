import { Data } from "effect"

export class IncidentNotFound extends Data.TaggedError("IncidentNotFound")<{
  readonly id: string
}> {}

export class DiagnosisFailed extends Data.TaggedError("DiagnosisFailed")<{
  readonly reason: string
  readonly attempts: number
}> {}

export class RemediationFailed extends Data.TaggedError("RemediationFailed")<{
  readonly step: string
  readonly reason: string
}> {}

export class ApprovalRequired extends Data.TaggedError("ApprovalRequired")<{
  readonly severity: string
  readonly blast_radius: string
}> {}

export class EscalationTriggered extends Data.TaggedError("EscalationTriggered")<{
  readonly reason: string
  readonly timeout_ms: number
}> {}

export class RollbackFailed extends Data.TaggedError("RollbackFailed")<{
  readonly step: string
  readonly reason: string
}> {}

export class EntityNotFound extends Data.TaggedError("EntityNotFound")<{
  readonly id: string
}> {}

export class RelationNotFound extends Data.TaggedError("RelationNotFound")<{
  readonly id: string
}> {}

export class DuplicateEntity extends Data.TaggedError("DuplicateEntity")<{
  readonly id: string
}> {}

export class InvalidTransition extends Data.TaggedError("InvalidTransition")<{
  readonly from: string
  readonly to: string
}> {}

export class CircuitOpen extends Data.TaggedError("CircuitOpen")<{
  readonly service: string
  readonly until: number
}> {}
