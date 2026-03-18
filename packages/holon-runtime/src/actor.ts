import { Effect, Ref } from "effect"
import type { HolonRole } from "@argos/shared"
import type { Message, Mailbox } from "./mailbox.js"
import { makeMailbox } from "./mailbox.js"

export interface ActorConfig {
  readonly id: string
  readonly role: HolonRole
  readonly mailboxCapacity?: number
}

export type MessageHandler<T, S> = (
  message: Message<T>,
  state: S,
) => Effect.Effect<S>

export interface Actor<T, S> {
  readonly id: string
  readonly role: HolonRole
  readonly send: (message: Message<T>) => Effect.Effect<void>
  readonly getState: () => Effect.Effect<S>
  readonly processNext: () => Effect.Effect<void>
  readonly processAll: () => Effect.Effect<void>
  readonly mailbox: Mailbox<T>
}

export const makeActor = <T, S>(
  config: ActorConfig,
  initialState: S,
  handler: MessageHandler<T, S>,
): Effect.Effect<Actor<T, S>> =>
  Effect.gen(function* () {
    const mailbox = yield* makeMailbox<T>(config.mailboxCapacity ?? 100)
    const stateRef = yield* Ref.make<S>(initialState)

    const processNext = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const message = yield* mailbox.receive()
        const currentState = yield* Ref.get(stateRef)
        const newState = yield* handler(message, currentState)
        yield* Ref.set(stateRef, newState)
      })

    const processAll = (): Effect.Effect<void> =>
      Effect.gen(function* () {
        const size = yield* mailbox.size()
        for (let i = 0; i < size; i++) {
          yield* processNext()
        }
      })

    return {
      id: config.id,
      role: config.role,
      send: (message) => mailbox.send(message),
      getState: () => Ref.get(stateRef),
      processNext,
      processAll,
      mailbox,
    }
  })
