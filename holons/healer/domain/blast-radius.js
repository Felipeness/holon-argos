export const RISK_LEVEL = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
};
const findDownstreamServices = (serviceId, graph) => {
    const direct = [];
    const transitive = [];
    const visited = new Set([serviceId]);
    const queue = [{ id: serviceId, depth: 0 }];
    while (queue.length > 0) {
        const current = queue.shift();
        const downstream = graph.dependencies
            .filter((dep) => dep.from === current.id)
            .map((dep) => dep.to)
            .filter((id) => !visited.has(id));
        for (const id of downstream) {
            visited.add(id);
            if (current.depth === 0) {
                direct.push(id);
            }
            else {
                transitive.push(id);
            }
            queue.push({ id, depth: current.depth + 1 });
        }
    }
    return { direct, transitive };
};
const estimateAffectedUsers = (serviceIds, graph) => {
    const uniqueUsers = new Set();
    let total = 0;
    for (const id of serviceIds) {
        const service = graph.services.find((s) => s.id === id);
        if (service && !uniqueUsers.has(service.estimatedUsers)) {
            total += service.estimatedUsers;
            uniqueUsers.add(service.estimatedUsers);
        }
    }
    return total;
};
const classifyRiskLevel = (affectedCount, estimatedUsers, stepCount) => {
    if (affectedCount >= 5 || estimatedUsers >= 10_000 || stepCount >= 5) {
        return RISK_LEVEL.CRITICAL;
    }
    if (affectedCount >= 3 || estimatedUsers >= 1_000 || stepCount >= 3) {
        return RISK_LEVEL.HIGH;
    }
    if (affectedCount >= 1 || estimatedUsers >= 100) {
        return RISK_LEVEL.MEDIUM;
    }
    return RISK_LEVEL.LOW;
};
export const assessBlastRadius = (plan, targetServiceId, graph) => {
    const { direct, transitive } = findDownstreamServices(targetServiceId, graph);
    const allAffected = [targetServiceId, ...direct, ...transitive];
    const affectedUsers = estimateAffectedUsers(allAffected, graph);
    return {
        affectedServices: allAffected,
        estimatedAffectedUsers: affectedUsers,
        riskLevel: classifyRiskLevel(direct.length + transitive.length, affectedUsers, plan.steps.length),
        directlyAffected: direct,
        transitivelyAffected: transitive,
    };
};
//# sourceMappingURL=blast-radius.js.map