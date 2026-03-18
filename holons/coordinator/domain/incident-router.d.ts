import { Effect } from "effect";
import type { IncidentStatus, HolonRole } from "@argos/shared";
import { InvalidTransition } from "@argos/shared";
export interface RoutingDecision {
    readonly from: IncidentStatus;
    readonly to: IncidentStatus;
    readonly targetHolon: HolonRole;
}
export declare const routeIncident: (currentStatus: IncidentStatus, targetStatus: IncidentStatus) => Effect.Effect<RoutingDecision, InvalidTransition>;
export declare const isValidTransition: (from: IncidentStatus, to: IncidentStatus) => boolean;
export declare const getTargetHolon: (status: IncidentStatus) => HolonRole;
//# sourceMappingURL=incident-router.d.ts.map