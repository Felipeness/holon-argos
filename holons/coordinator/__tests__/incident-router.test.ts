import { describe, it, expect } from "vitest"
import { Effect, Exit } from "effect"
import { INCIDENT_STATUS, HOLON_ROLES } from "@orchestrix/shared"
import { routeIncident, isValidTransition, getTargetHolon } from "../domain/incident-router.js"

describe("incident-router", () => {
  describe("routeIncident", () => {
    it("routes DETECTED -> DIAGNOSING to diagnostician", async () => {
      const result = await Effect.runPromise(
        routeIncident(INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.DIAGNOSING),
      )

      expect(result.from).toBe(INCIDENT_STATUS.DETECTED)
      expect(result.to).toBe(INCIDENT_STATUS.DIAGNOSING)
      expect(result.targetHolon).toBe(HOLON_ROLES.DIAGNOSTICIAN)
    })

    it("routes DIAGNOSING -> ASSESSING to healer", async () => {
      const result = await Effect.runPromise(
        routeIncident(INCIDENT_STATUS.DIAGNOSING, INCIDENT_STATUS.ASSESSING),
      )

      expect(result.targetHolon).toBe(HOLON_ROLES.HEALER)
    })

    it("routes ASSESSING -> HEALING to healer", async () => {
      const result = await Effect.runPromise(
        routeIncident(INCIDENT_STATUS.ASSESSING, INCIDENT_STATUS.HEALING),
      )

      expect(result.targetHolon).toBe(HOLON_ROLES.HEALER)
    })

    it("routes HEALING -> VERIFYING to healer", async () => {
      const result = await Effect.runPromise(
        routeIncident(INCIDENT_STATUS.HEALING, INCIDENT_STATUS.VERIFYING),
      )

      expect(result.targetHolon).toBe(HOLON_ROLES.HEALER)
    })

    it("routes VERIFYING -> RESOLVED to historian", async () => {
      const result = await Effect.runPromise(
        routeIncident(INCIDENT_STATUS.VERIFYING, INCIDENT_STATUS.RESOLVED),
      )

      expect(result.targetHolon).toBe(HOLON_ROLES.HISTORIAN)
    })

    it("routes HEALING -> ESCALATED to coordinator", async () => {
      const result = await Effect.runPromise(
        routeIncident(INCIDENT_STATUS.HEALING, INCIDENT_STATUS.ESCALATED),
      )

      expect(result.targetHolon).toBe(HOLON_ROLES.COORDINATOR)
    })

    it("fails on invalid transition DETECTED -> HEALING", async () => {
      const exit = await Effect.runPromise(
        Effect.exit(routeIncident(INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.HEALING)),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })

    it("fails on invalid transition RESOLVED -> DIAGNOSING", async () => {
      const exit = await Effect.runPromise(
        Effect.exit(routeIncident(INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.DIAGNOSING)),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })

    it("fails on invalid transition ESCALATED -> HEALING", async () => {
      const exit = await Effect.runPromise(
        Effect.exit(routeIncident(INCIDENT_STATUS.ESCALATED, INCIDENT_STATUS.HEALING)),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("isValidTransition", () => {
    const validCases = [
      [INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.DIAGNOSING],
      [INCIDENT_STATUS.DIAGNOSING, INCIDENT_STATUS.ASSESSING],
      [INCIDENT_STATUS.ASSESSING, INCIDENT_STATUS.HEALING],
      [INCIDENT_STATUS.HEALING, INCIDENT_STATUS.VERIFYING],
      [INCIDENT_STATUS.VERIFYING, INCIDENT_STATUS.RESOLVED],
    ] as const

    it.each(validCases)("allows %s -> %s", (from, to) => {
      expect(isValidTransition(from, to)).toBe(true)
    })

    const invalidCases = [
      [INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.RESOLVED],
      [INCIDENT_STATUS.DETECTED, INCIDENT_STATUS.HEALING],
      [INCIDENT_STATUS.RESOLVED, INCIDENT_STATUS.DETECTED],
      [INCIDENT_STATUS.ESCALATED, INCIDENT_STATUS.DIAGNOSING],
    ] as const

    it.each(invalidCases)("rejects %s -> %s", (from, to) => {
      expect(isValidTransition(from, to)).toBe(false)
    })
  })

  describe("getTargetHolon", () => {
    it("maps DIAGNOSING to diagnostician", () => {
      expect(getTargetHolon(INCIDENT_STATUS.DIAGNOSING)).toBe(HOLON_ROLES.DIAGNOSTICIAN)
    })

    it("maps HEALING to healer", () => {
      expect(getTargetHolon(INCIDENT_STATUS.HEALING)).toBe(HOLON_ROLES.HEALER)
    })

    it("maps RESOLVED to historian", () => {
      expect(getTargetHolon(INCIDENT_STATUS.RESOLVED)).toBe(HOLON_ROLES.HISTORIAN)
    })

    it("maps ESCALATED to coordinator", () => {
      expect(getTargetHolon(INCIDENT_STATUS.ESCALATED)).toBe(HOLON_ROLES.COORDINATOR)
    })
  })
})
