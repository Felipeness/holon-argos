import { describe, it, expect } from "vitest"
import { Effect, Exit } from "effect"
import { INCIDENT_STATUS } from "@orchestrix/shared"
import { canTransition, transition, validTransitionsFrom, isTerminal } from "../src/dfa.js"

describe("Incident lifecycle DFA", () => {
  describe("canTransition", () => {
    it("allows DETECTED -> DIAGNOSING", () => {
      expect(canTransition(INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.DIAGNOSING)).toBe(true)
    })

    it("allows DIAGNOSING -> ASSESSING", () => {
      expect(canTransition(INCIDENT_STATUS.DIAGNOSING, INCIDENT_STATUS.ASSESSING)).toBe(true)
    })

    it("allows DIAGNOSING -> ESCALATED (timeout)", () => {
      expect(canTransition(INCIDENT_STATUS.DIAGNOSING, INCIDENT_STATUS.ESCALATED)).toBe(true)
    })

    it("allows ASSESSING -> HEALING", () => {
      expect(canTransition(INCIDENT_STATUS.ASSESSING, INCIDENT_STATUS.HEALING)).toBe(true)
    })

    it("allows HEALING -> VERIFYING", () => {
      expect(canTransition(INCIDENT_STATUS.HEALING, INCIDENT_STATUS.VERIFYING)).toBe(true)
    })

    it("allows HEALING -> ESCALATED (failure)", () => {
      expect(canTransition(INCIDENT_STATUS.HEALING, INCIDENT_STATUS.ESCALATED)).toBe(true)
    })

    it("allows VERIFYING -> RESOLVED", () => {
      expect(canTransition(INCIDENT_STATUS.VERIFYING, INCIDENT_STATUS.RESOLVED)).toBe(true)
    })

    it("allows VERIFYING -> ESCALATED", () => {
      expect(canTransition(INCIDENT_STATUS.VERIFYING, INCIDENT_STATUS.ESCALATED)).toBe(true)
    })

    it("allows VERIFYING -> HEALING (retry)", () => {
      expect(canTransition(INCIDENT_STATUS.VERIFYING, INCIDENT_STATUS.HEALING)).toBe(true)
    })

    it("rejects DETECTED -> HEALING (skip)", () => {
      expect(canTransition(INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.HEALING)).toBe(false)
    })

    it("rejects RESOLVED -> anything", () => {
      expect(canTransition(INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.DETECTED)).toBe(false)
      expect(canTransition(INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.DIAGNOSING)).toBe(false)
    })

    it("rejects ESCALATED -> anything", () => {
      expect(canTransition(INCIDENT_STATUS.ESCALATED, INCIDENT_STATUS.DETECTED)).toBe(false)
    })
  })

  describe("transition", () => {
    it("returns new state on valid transition", async () => {
      const result = await Effect.runPromise(
        transition(INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.DIAGNOSING),
      )
      expect(result).toBe(INCIDENT_STATUS.DIAGNOSING)
    })

    it("fails with InvalidTransition on invalid transition", async () => {
      const exit = await Effect.runPromise(
        Effect.exit(transition(INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.RESOLVED)),
      )
      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("validTransitionsFrom", () => {
    it("returns valid transitions for DIAGNOSING", () => {
      const valid = validTransitionsFrom(INCIDENT_STATUS.DIAGNOSING)
      expect(valid).toContain(INCIDENT_STATUS.ASSESSING)
      expect(valid).toContain(INCIDENT_STATUS.ESCALATED)
    })

    it("returns empty array for terminal states", () => {
      expect(validTransitionsFrom(INCIDENT_STATUS.RESOLVED)).toEqual([])
      expect(validTransitionsFrom(INCIDENT_STATUS.ESCALATED)).toEqual([])
    })
  })

  describe("isTerminal", () => {
    it("identifies RESOLVED as terminal", () => {
      expect(isTerminal(INCIDENT_STATUS.RESOLVED)).toBe(true)
    })

    it("identifies ESCALATED as terminal", () => {
      expect(isTerminal(INCIDENT_STATUS.ESCALATED)).toBe(true)
    })

    it("identifies HEALING as non-terminal", () => {
      expect(isTerminal(INCIDENT_STATUS.HEALING)).toBe(false)
    })
  })
})
