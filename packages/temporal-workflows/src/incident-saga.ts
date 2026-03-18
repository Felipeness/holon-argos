import type { IncidentStatus, Severity } from "@argos/shared"

export interface IncidentContext {
  readonly incidentId: string
  readonly severity: Severity
  readonly alertFingerprint: string
  readonly serviceId: string
  readonly detectedAt: number
}

export interface DiagnosisResult {
  readonly rootCause: string
  readonly confidence: number
  readonly relatedIncidents: readonly string[]
  readonly suggestedRunbooks: readonly string[]
}

export interface AssessmentResult {
  readonly blastRadius: string
  readonly affectedServices: readonly string[]
  readonly requiresApproval: boolean
  readonly estimatedRecoveryMs: number
}

export interface RemediationPlan {
  readonly steps: readonly RemediationStep[]
  readonly rollbackPlan: readonly RollbackStep[]
  readonly estimatedDurationMs: number
}

export interface RemediationStep {
  readonly name: string
  readonly action: string
  readonly params: Record<string, unknown>
  readonly timeoutMs: number
}

export interface RollbackStep {
  readonly name: string
  readonly action: string
  readonly params: Record<string, unknown>
}

export interface VerificationResult {
  readonly healthy: boolean
  readonly metrics: Record<string, number>
  readonly checksPassed: readonly string[]
  readonly checksFailed: readonly string[]
}

export interface IncidentSagaState {
  readonly context: IncidentContext
  readonly status: IncidentStatus
  readonly diagnosis?: DiagnosisResult
  readonly assessment?: AssessmentResult
  readonly remediationPlan?: RemediationPlan
  readonly verification?: VerificationResult
  readonly escalationReason?: string
  readonly retryCount: number
  readonly startedAt: number
  readonly updatedAt: number
}

export interface IncidentWorkflow {
  readonly detect: (context: IncidentContext) => Promise<void>
  readonly diagnose: (incidentId: string) => Promise<DiagnosisResult>
  readonly assess: (incidentId: string, diagnosis: DiagnosisResult) => Promise<AssessmentResult>
  readonly heal: (incidentId: string, plan: RemediationPlan) => Promise<void>
  readonly verify: (incidentId: string) => Promise<VerificationResult>
  readonly escalate: (incidentId: string, reason: string) => Promise<void>
}

export interface IncidentActivities {
  readonly collectAlerts: (fingerprint: string) => Promise<unknown[]>
  readonly runDiagnostics: (serviceId: string) => Promise<DiagnosisResult>
  readonly assessBlastRadius: (serviceId: string) => Promise<AssessmentResult>
  readonly buildRemediationPlan: (diagnosis: DiagnosisResult) => Promise<RemediationPlan>
  readonly executeStep: (step: RemediationStep) => Promise<void>
  readonly rollbackStep: (step: RollbackStep) => Promise<void>
  readonly runHealthChecks: (serviceId: string) => Promise<VerificationResult>
  readonly notifyTeam: (incidentId: string, message: string) => Promise<void>
  readonly recordPostmortem: (incidentId: string, state: IncidentSagaState) => Promise<void>
}

export const TASK_QUEUES = {
  SENTINEL: "sentinel-queue",
  DIAGNOSTICIAN: "diagnostician-queue",
  HEALER: "healer-queue",
  HISTORIAN: "historian-queue",
  COORDINATOR: "coordinator-queue",
} as const

export const WORKFLOW_IDS = {
  INCIDENT_SAGA: "incident-saga",
  POSTMORTEM_GENERATION: "postmortem-generation",
} as const
