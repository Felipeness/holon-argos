import type { Severity } from "@argos/shared";
import type { GraphEvent } from "@argos/graph-memory";
import type { Hypothesis, AlertSignal, MetricSignal } from "../../../holons/diagnostician/domain/hypothesis-generator.js";
import type { RunbookMatch } from "../../../holons/diagnostician/domain/runbook-matcher.js";
import type { ApprovalDecision } from "../../../holons/healer/domain/approval-gate.js";
export interface PipelineInput {
    readonly incidentId: string;
    readonly serviceId: string;
    readonly severity: Severity;
    readonly alerts: readonly AlertSignal[];
    readonly metrics: readonly MetricSignal[];
    readonly errorMessages: readonly string[];
}
export interface PipelineResult {
    readonly incidentId: string;
    readonly severity: Severity;
    readonly targetHolon: string;
    readonly hypotheses: readonly Hypothesis[];
    readonly topHypothesis: Hypothesis | null;
    readonly runbooks: readonly RunbookMatch[];
    readonly approval: ApprovalDecision;
    readonly eventsRecorded: number;
    readonly graphEvents: readonly GraphEvent[];
}
/**
 * Orchestrates the incident pipeline through all holons:
 *
 * sentinel.classify -> coordinator.route -> diagnostician.analyze -> healer.evaluate -> historian.record
 *
 * This chains pure domain functions synchronously. In production, Temporal
 * workflows handle the async orchestration with compensation/rollback.
 */
export declare const processIncident: (input: PipelineInput) => PipelineResult;
//# sourceMappingURL=pipeline.d.ts.map