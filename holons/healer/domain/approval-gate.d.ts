import type { Severity } from "@argos/shared";
import { type RiskLevel } from "./blast-radius.js";
export declare const APPROVAL_DECISION: {
    readonly AUTO_APPROVED: "auto_approved";
    readonly REQUIRES_HUMAN: "requires_human";
};
export type ApprovalDecisionType = (typeof APPROVAL_DECISION)[keyof typeof APPROVAL_DECISION];
export interface ApprovalDecision {
    readonly decision: ApprovalDecisionType;
    readonly reason: string;
}
export declare const evaluateApproval: (severity: Severity, riskLevel: RiskLevel) => ApprovalDecision;
//# sourceMappingURL=approval-gate.d.ts.map