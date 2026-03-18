import { Effect } from "effect";
import { INCIDENT_STATUS, HOLON_ROLES } from "@argos/shared";
import { canTransition, transition } from "@argos/blueprint-engine";
const stateToHolon = new Map([
    [INCIDENT_STATUS.DETECTED, HOLON_ROLES.SENTINEL],
    [INCIDENT_STATUS.DIAGNOSING, HOLON_ROLES.DIAGNOSTICIAN],
    [INCIDENT_STATUS.ASSESSING, HOLON_ROLES.HEALER],
    [INCIDENT_STATUS.HEALING, HOLON_ROLES.HEALER],
    [INCIDENT_STATUS.VERIFYING, HOLON_ROLES.HEALER],
    [INCIDENT_STATUS.RESOLVED, HOLON_ROLES.HISTORIAN],
    [INCIDENT_STATUS.ESCALATED, HOLON_ROLES.COORDINATOR],
]);
export const routeIncident = (currentStatus, targetStatus) => Effect.map(transition(currentStatus, targetStatus), (newStatus) => {
    const targetHolon = stateToHolon.get(newStatus) ?? HOLON_ROLES.COORDINATOR;
    return {
        from: currentStatus,
        to: newStatus,
        targetHolon,
    };
});
export const isValidTransition = (from, to) => canTransition(from, to);
export const getTargetHolon = (status) => stateToHolon.get(status) ?? HOLON_ROLES.COORDINATOR;
//# sourceMappingURL=incident-router.js.map