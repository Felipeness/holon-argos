import { Effect, Queue, Ref } from "effect"

export interface Message<T = unknown> {
  readonly id: string
  readonly type: string
  readonly payload: T
  readonly timestamp: number
  readonly correlationId?: string
}

export interface Mailbox<T> {
  readonly send: (message: Message<T>) => Effect.Effect<void>
  readonly receive: () => Effect.Effect<Message<T>>
  readonly size: () => Effect.Effect<number>
  readonly drain: () => Effect.Effect<readonly Message<T>[]>
}

export const makeMailbox = <T>(capacity: number): Effect.Effect<Mailbox<T>> =>
  Effect.gen(function* () {
    const queue = yield* Queue.bounded<Message<T>>(capacity)
    const processedCount = yield* Ref.make(0)

    return {
      send: (message) => Queue.offer(queue, message),
      receive: () =>
        Effect.tap(Queue.take(queue), () =>
          Ref.update(processedCount, (n) => n + 1),
        ),
      size: () => Queue.size(queue),
      drain: () =>
        Effect.gen(function* () {
          const messages: Message<T>[] = []
          const currentSize = yield* Queue.size(queue)
          for (let i = 0; i < currentSize; i++) {
            const msg = yield* Queue.poll(queue)
            if (msg._tag === "Some") {
              messages.push(msg.value)
            }
          }
          return messages
        }),
    }
  })
