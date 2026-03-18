import { type Severity } from "@argos/shared";
export declare const SERVICE_TIER: {
    readonly CRITICAL: "CRITICAL";
    readonly STANDARD: "STANDARD";
    readonly INTERNAL: "INTERNAL";
};
export type ServiceTier = (typeof SERVICE_TIER)[keyof typeof SERVICE_TIER];
export interface IncidentContext {
    readonly serviceTier: ServiceTier;
    readonly userImpactPercent: number;
    readonly isServiceDown: boolean;
    readonly durationMs: number;
}
export interface SeverityClassification {
    readonly severity: Severity;
    readonly autoRemediate: boolean;
    readonly reason: string;
}
export declare const classifySeverity: (ctx: IncidentContext) => SeverityClassification;
//# sourceMappingURL=severity-classifier.d.ts.map