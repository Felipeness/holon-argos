import { Effect } from "effect"
import { execSync } from "child_process"

export type FixRequest = {
  readonly rootCause: string
  readonly codebasePath: string
  readonly suggestedFix: string
}

export type FixResult = {
  readonly filesModified: string[]
  readonly commitMessage: string
  readonly testsPassed: boolean
}

export class FixError {
  readonly _tag = "FixError" as const
  constructor(readonly reason: string) {}
}

export const applyFixWithClaude = (request: FixRequest): Effect.Effect<FixResult, FixError> =>
  Effect.try({
    try: () => {
      const prompt = `Fix the following issue in the codebase. Write the fix, run tests, and commit.

Root cause: ${request.rootCause}
Suggested fix: ${request.suggestedFix}
Codebase: ${request.codebasePath}

After fixing, output JSON with: filesModified (array), commitMessage (string), testsPassed (boolean)`

      const output = execSync(
        `claude -p "${prompt.replace(/"/g, '\\"')}" --allowedTools "Read,Edit,Bash,Glob,Grep" --output-format json --max-turns 20`,
        { encoding: "utf-8", timeout: 300_000, maxBuffer: 10 * 1024 * 1024, cwd: request.codebasePath }
      )

      return JSON.parse(output) as FixResult
    },
    catch: (error: any) => new FixError(error?.message ?? "Fix failed"),
  })
