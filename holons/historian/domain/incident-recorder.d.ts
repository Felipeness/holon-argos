import type { GraphEvent } from "@argos/graph-memory";
import type { CorrelationId, HolonId } from "@argos/shared";
export declare const INCIDENT_EVENT_TYPES: {
    readonly DETECTED: "detected";
    readonly DIAGNOSED: "diagnosed";
    readonly ASSESSMENT_COMPLETE: "assessment_complete";
    readonly REMEDIATION_STARTED: "remediation_started";
    readonly REMEDIATION_COMPLETE: "remediation_complete";
    readonly VERIFIED: "verified";
    readonly RESOLVED: "resolved";
};
export type IncidentEventType = (typeof INCIDENT_EVENT_TYPES)[keyof typeof INCIDENT_EVENT_TYPES];
export interface IncidentLifecycleEvent {
    readonly incidentId: string;
    readonly eventType: IncidentEventType;
    readonly correlationId: CorrelationId;
    readonly actorHolon: HolonId;
    readonly timestamp: number;
    readonly metadata: Record<string, unknown>;
}
export declare const recordIncidentEvent: (event: IncidentLifecycleEvent) => readonly GraphEvent[];
export declare const buildEventSequence: (incidentId: string, correlationId: CorrelationId, actorHolon: HolonId, eventTypes: readonly IncidentEventType[], baseTimestamp: number) => readonly IncidentLifecycleEvent[];
//# sourceMappingURL=incident-recorder.d.ts.map