import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { makeActor } from "../src/index.js"
import type { Message } from "../src/index.js"

interface CountState {
  readonly count: number
}

const counterHandler = (
  message: Message<{ amount: number }>,
  state: CountState,
): Effect.Effect<CountState> =>
  Effect.succeed({ count: state.count + message.payload.amount })

describe("Actor", () => {
  it("creates an actor with initial state", async () => {
    const state = await Effect.runPromise(
      Effect.gen(function* () {
        const actor = yield* makeActor(
          { id: "counter-1", role: "sentinel" },
          { count: 0 },
          counterHandler,
        )
        return yield* actor.getState()
      }),
    )

    expect(state).toEqual({ count: 0 })
  })

  it("processes messages and updates state", async () => {
    const state = await Effect.runPromise(
      Effect.gen(function* () {
        const actor = yield* makeActor(
          { id: "counter-2", role: "sentinel" },
          { count: 0 },
          counterHandler,
        )

        yield* actor.send({
          id: "msg-1",
          type: "increment",
          payload: { amount: 5 },
          timestamp: Date.now(),
        })
        yield* actor.send({
          id: "msg-2",
          type: "increment",
          payload: { amount: 3 },
          timestamp: Date.now(),
        })

        yield* actor.processAll()
        return yield* actor.getState()
      }),
    )

    expect(state).toEqual({ count: 8 })
  })

  it("exposes actor id and role", async () => {
    const { id, role } = await Effect.runPromise(
      Effect.gen(function* () {
        const actor = yield* makeActor(
          { id: "sentinel-1", role: "sentinel" },
          { count: 0 },
          counterHandler,
        )
        return { id: actor.id, role: actor.role }
      }),
    )

    expect(id).toBe("sentinel-1")
    expect(role).toBe("sentinel")
  })

  it("processes messages one by one", async () => {
    const state = await Effect.runPromise(
      Effect.gen(function* () {
        const actor = yield* makeActor(
          { id: "counter-3", role: "diagnostician" },
          { count: 0 },
          counterHandler,
        )

        yield* actor.send({
          id: "msg-1",
          type: "increment",
          payload: { amount: 10 },
          timestamp: Date.now(),
        })
        yield* actor.send({
          id: "msg-2",
          type: "increment",
          payload: { amount: 20 },
          timestamp: Date.now(),
        })

        yield* actor.processNext()
        return yield* actor.getState()
      }),
    )

    expect(state).toEqual({ count: 10 })
  })
})
