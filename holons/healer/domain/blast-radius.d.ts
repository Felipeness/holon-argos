import type { RemediationPlan } from "@argos/temporal-workflows";
export declare const RISK_LEVEL: {
    readonly LOW: "LOW";
    readonly MEDIUM: "MEDIUM";
    readonly HIGH: "HIGH";
    readonly CRITICAL: "CRITICAL";
};
export type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL];
export interface ServiceNode {
    readonly id: string;
    readonly name: string;
    readonly estimatedUsers: number;
}
export interface ServiceDependency {
    readonly from: string;
    readonly to: string;
}
export interface ServiceGraph {
    readonly services: readonly ServiceNode[];
    readonly dependencies: readonly ServiceDependency[];
}
export interface BlastRadiusAssessment {
    readonly affectedServices: readonly string[];
    readonly estimatedAffectedUsers: number;
    readonly riskLevel: RiskLevel;
    readonly directlyAffected: readonly string[];
    readonly transitivelyAffected: readonly string[];
}
export declare const assessBlastRadius: (plan: RemediationPlan, targetServiceId: string, graph: ServiceGraph) => BlastRadiusAssessment;
//# sourceMappingURL=blast-radius.d.ts.map