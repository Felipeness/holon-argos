import { Effect } from "effect"
import { execSync } from "child_process"

export type AnalysisRequest = {
  readonly incidentDescription: string
  readonly logs?: string
  readonly metrics?: string
  readonly context?: string
}

export type AnalysisResponse = {
  readonly rootCause: string
  readonly confidence: number
  readonly suggestedFix: string
  readonly reasoning: string
}

export class AnalysisError {
  readonly _tag = "AnalysisError" as const
  constructor(readonly reason: string) {}
}

export const analyzeWithClaude = (request: AnalysisRequest): Effect.Effect<AnalysisResponse, AnalysisError> =>
  Effect.try({
    try: () => {
      const prompt = `You are an SRE analyzing a production incident. Respond in JSON format with fields: rootCause, confidence (0-1), suggestedFix, reasoning.

Incident: ${request.incidentDescription}
${request.logs ? `Logs:\n${request.logs}` : ""}
${request.metrics ? `Metrics:\n${request.metrics}` : ""}
${request.context ? `Context:\n${request.context}` : ""}`

      const output = execSync(
        `claude -p "${prompt.replace(/"/g, '\\"')}" --output-format json --max-turns 3`,
        { encoding: "utf-8", timeout: 60_000, maxBuffer: 5 * 1024 * 1024 }
      )

      return JSON.parse(output) as AnalysisResponse
    },
    catch: (error: any) => new AnalysisError(error?.message ?? "Analysis failed"),
  })
