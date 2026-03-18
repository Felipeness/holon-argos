import { SEVERITY } from "@argos/shared";
export const SERVICE_TIER = {
    CRITICAL: "CRITICAL",
    STANDARD: "STANDARD",
    INTERNAL: "INTERNAL",
};
const DURATION_ESCALATION_THRESHOLD_MS = 900_000;
const classifyByImpact = (ctx) => {
    if (ctx.isServiceDown && ctx.userImpactPercent > 50) {
        return SEVERITY.P1;
    }
    if (ctx.isServiceDown) {
        return ctx.serviceTier === SERVICE_TIER.CRITICAL ? SEVERITY.P1 : SEVERITY.P2;
    }
    if (ctx.userImpactPercent > 50) {
        return SEVERITY.P1;
    }
    if (ctx.userImpactPercent > 10) {
        return SEVERITY.P2;
    }
    if (ctx.userImpactPercent > 1) {
        return SEVERITY.P3;
    }
    if (ctx.userImpactPercent > 0) {
        return SEVERITY.P4;
    }
    return SEVERITY.P5;
};
const escalateForDuration = (severity, durationMs) => {
    if (durationMs < DURATION_ESCALATION_THRESHOLD_MS) {
        return severity;
    }
    const escalationMap = {
        [SEVERITY.P5]: SEVERITY.P4,
        [SEVERITY.P4]: SEVERITY.P3,
        [SEVERITY.P3]: SEVERITY.P2,
        [SEVERITY.P2]: SEVERITY.P1,
        [SEVERITY.P1]: SEVERITY.P1,
    };
    return escalationMap[severity];
};
const escalateForTier = (severity, tier) => {
    if (tier !== SERVICE_TIER.CRITICAL) {
        return severity;
    }
    const tierEscalation = {
        [SEVERITY.P5]: SEVERITY.P4,
        [SEVERITY.P4]: SEVERITY.P3,
        [SEVERITY.P3]: SEVERITY.P2,
        [SEVERITY.P2]: SEVERITY.P1,
        [SEVERITY.P1]: SEVERITY.P1,
    };
    return tierEscalation[severity];
};
const shouldAutoRemediate = (severity) => severity === SEVERITY.P1 || severity === SEVERITY.P2;
const buildReason = (ctx, severity) => {
    const parts = [];
    if (ctx.isServiceDown) {
        parts.push("service is down");
    }
    parts.push(`${ctx.userImpactPercent}% users affected`);
    parts.push(`tier: ${ctx.serviceTier}`);
    parts.push(`duration: ${Math.round(ctx.durationMs / 1000)}s`);
    return `${severity} — ${parts.join(", ")}`;
};
export const classifySeverity = (ctx) => {
    const baseSeverity = classifyByImpact(ctx);
    const durationAdjusted = escalateForDuration(baseSeverity, ctx.durationMs);
    const finalSeverity = escalateForTier(durationAdjusted, ctx.serviceTier);
    return {
        severity: finalSeverity,
        autoRemediate: shouldAutoRemediate(finalSeverity),
        reason: buildReason(ctx, finalSeverity),
    };
};
//# sourceMappingURL=severity-classifier.js.map