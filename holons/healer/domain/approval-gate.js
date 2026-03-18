import { RISK_LEVEL } from "./blast-radius.js";
export const APPROVAL_DECISION = {
    AUTO_APPROVED: "auto_approved",
    REQUIRES_HUMAN: "requires_human",
};
const isLowBlastRadius = (riskLevel) => riskLevel === RISK_LEVEL.LOW || riskLevel === RISK_LEVEL.MEDIUM;
export const evaluateApproval = (severity, riskLevel) => {
    if (severity === "P1" || severity === "P2") {
        return {
            decision: APPROVAL_DECISION.AUTO_APPROVED,
            reason: `severity ${severity} qualifies for auto-approval (immediate action needed)`,
        };
    }
    if (severity === "P3") {
        return isLowBlastRadius(riskLevel)
            ? {
                decision: APPROVAL_DECISION.AUTO_APPROVED,
                reason: `severity P3 with ${riskLevel} blast radius qualifies for auto-approval`,
            }
            : {
                decision: APPROVAL_DECISION.REQUIRES_HUMAN,
                reason: `severity P3 with ${riskLevel} blast radius requires human approval`,
            };
    }
    return {
        decision: APPROVAL_DECISION.REQUIRES_HUMAN,
        reason: `severity ${severity} always requires human approval`,
    };
};
//# sourceMappingURL=approval-gate.js.map