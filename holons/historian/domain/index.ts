import { Context, Effect } from "effect"

export interface PostmortemData {
  readonly incidentId: string
  readonly title: string
  readonly timeline: readonly TimelineEntry[]
  readonly rootCause: string
  readonly impact: string
  readonly resolution: string
  readonly lessonsLearned: readonly string[]
  readonly actionItems: readonly ActionItem[]
  readonly generatedAt: number
}

export interface TimelineEntry {
  readonly timestamp: number
  readonly event: string
  readonly actor: string
}

export interface ActionItem {
  readonly description: string
  readonly assignee: string
  readonly priority: "high" | "medium" | "low"
  readonly dueDate?: string
}

export interface HistorianDomain {
  readonly generatePostmortem: (incidentId: string) => Effect.Effect<PostmortemData>
  readonly findSimilarIncidents: (params: {
    rootCause: string
    serviceId: string
    limit: number
  }) => Effect.Effect<readonly string[]>
  readonly getIncidentTimeline: (incidentId: string) => Effect.Effect<readonly TimelineEntry[]>
}

export class HistorianService extends Context.Tag("HistorianService")<
  HistorianService,
  HistorianDomain
>() {}
