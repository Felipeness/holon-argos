import type { Severity } from "@argos/shared";
export interface IncidentData {
    readonly serviceId: string;
    readonly severity: Severity;
    readonly alerts: readonly AlertSignal[];
    readonly metrics: readonly MetricSignal[];
    readonly errorMessages: readonly string[];
}
export interface AlertSignal {
    readonly source: string;
    readonly message: string;
    readonly labels: Record<string, string>;
}
export interface MetricSignal {
    readonly name: string;
    readonly value: number;
    readonly threshold: number;
}
export interface Hypothesis {
    readonly id: string;
    readonly description: string;
    readonly likelihood: number;
    readonly evidenceNeeded: readonly string[];
}
export declare const generateHypotheses: (data: IncidentData) => readonly Hypothesis[];
//# sourceMappingURL=hypothesis-generator.d.ts.map