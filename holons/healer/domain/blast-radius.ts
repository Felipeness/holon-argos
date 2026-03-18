import type { RemediationPlan } from "@orchestrix/temporal-workflows"

export const RISK_LEVEL = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const

export type RiskLevel = (typeof RISK_LEVEL)[keyof typeof RISK_LEVEL]

export interface ServiceNode {
  readonly id: string
  readonly name: string
  readonly estimatedUsers: number
}

export interface ServiceDependency {
  readonly from: string
  readonly to: string
}

export interface ServiceGraph {
  readonly services: readonly ServiceNode[]
  readonly dependencies: readonly ServiceDependency[]
}

export interface BlastRadiusAssessment {
  readonly affectedServices: readonly string[]
  readonly estimatedAffectedUsers: number
  readonly riskLevel: RiskLevel
  readonly directlyAffected: readonly string[]
  readonly transitivelyAffected: readonly string[]
}

const findDownstreamServices = (
  serviceId: string,
  graph: ServiceGraph,
): { direct: readonly string[]; transitive: readonly string[] } => {
  const direct: string[] = []
  const transitive: string[] = []
  const visited = new Set<string>([serviceId])
  const queue: Array<{ id: string; depth: number }> = [{ id: serviceId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    const downstream = graph.dependencies
      .filter((dep) => dep.from === current.id)
      .map((dep) => dep.to)
      .filter((id) => !visited.has(id))

    for (const id of downstream) {
      visited.add(id)

      if (current.depth === 0) {
        direct.push(id)
      } else {
        transitive.push(id)
      }

      queue.push({ id, depth: current.depth + 1 })
    }
  }

  return { direct, transitive }
}

const estimateAffectedUsers = (
  serviceIds: readonly string[],
  graph: ServiceGraph,
): number => {
  const uniqueUsers = new Set<number>()
  let total = 0

  for (const id of serviceIds) {
    const service = graph.services.find((s) => s.id === id)
    if (service && !uniqueUsers.has(service.estimatedUsers)) {
      total += service.estimatedUsers
      uniqueUsers.add(service.estimatedUsers)
    }
  }

  return total
}

const classifyRiskLevel = (
  affectedCount: number,
  estimatedUsers: number,
  stepCount: number,
): RiskLevel => {
  if (affectedCount >= 5 || estimatedUsers >= 10_000 || stepCount >= 5) {
    return RISK_LEVEL.CRITICAL
  }

  if (affectedCount >= 3 || estimatedUsers >= 1_000 || stepCount >= 3) {
    return RISK_LEVEL.HIGH
  }

  if (affectedCount >= 1 || estimatedUsers >= 100) {
    return RISK_LEVEL.MEDIUM
  }

  return RISK_LEVEL.LOW
}

export const assessBlastRadius = (
  plan: RemediationPlan,
  targetServiceId: string,
  graph: ServiceGraph,
): BlastRadiusAssessment => {
  const { direct, transitive } = findDownstreamServices(targetServiceId, graph)
  const allAffected = [targetServiceId, ...direct, ...transitive]
  const affectedUsers = estimateAffectedUsers(allAffected, graph)

  return {
    affectedServices: allAffected,
    estimatedAffectedUsers: affectedUsers,
    riskLevel: classifyRiskLevel(direct.length + transitive.length, affectedUsers, plan.steps.length),
    directlyAffected: direct,
    transitivelyAffected: transitive,
  }
}
