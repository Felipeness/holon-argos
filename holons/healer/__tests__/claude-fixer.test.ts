import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { applyFixWithClaude, FixError } from "../infra/claude-fixer.js"
import type { FixRequest } from "../infra/claude-fixer.js"

describe("claude-fixer", () => {
  it("constructs valid fix request", () => {
    const request: FixRequest = {
      rootCause: "Missing null check in payment handler",
      codebasePath: "/app/services/payment",
      suggestedFix: "Add guard clause for null user before processing payment",
    }

    expect(request.rootCause).toBe("Missing null check in payment handler")
    expect(request.codebasePath).toBe("/app/services/payment")
    expect(request.suggestedFix).toBeDefined()
  })

  it("FixError has correct tag", () => {
    const error = new FixError("Tests failed after fix")

    expect(error._tag).toBe("FixError")
    expect(error.reason).toBe("Tests failed after fix")
  })

  it("returns an Effect type", () => {
    const request: FixRequest = {
      rootCause: "test",
      codebasePath: "/tmp",
      suggestedFix: "test fix",
    }
    const result = applyFixWithClaude(request)

    expect(Effect.isEffect(result)).toBe(true)
  })
})
