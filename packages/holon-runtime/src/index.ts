export { makeMailbox } from "./mailbox.js"
export { makeActor } from "./actor.js"
export { makeSupervisor, RESTART_STRATEGY, defaultSupervisorConfig } from "./supervisor.js"

export type { Message, Mailbox } from "./mailbox.js"
export type { Actor, ActorConfig, MessageHandler } from "./actor.js"
export type { Supervisor, SupervisedChild, SupervisorConfig, RestartStrategy } from "./supervisor.js"
