import { Context, Effect, Layer } from "effect"

export const LOG_LEVEL = {
  DEBUG: "DEBUG",
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
} as const

export type LogLevel = (typeof LOG_LEVEL)[keyof typeof LOG_LEVEL]

export interface StructuredLog {
  readonly level: LogLevel
  readonly message: string
  readonly timestamp: string
  readonly correlationId?: string
  readonly holonId?: string
  readonly attributes?: Record<string, unknown>
}

export interface Logger {
  readonly debug: (message: string, attrs?: Record<string, unknown>) => Effect.Effect<void>
  readonly info: (message: string, attrs?: Record<string, unknown>) => Effect.Effect<void>
  readonly warn: (message: string, attrs?: Record<string, unknown>) => Effect.Effect<void>
  readonly error: (message: string, attrs?: Record<string, unknown>) => Effect.Effect<void>
  readonly child: (defaultAttrs: Record<string, unknown>) => Logger
}

export class LoggerService extends Context.Tag("LoggerService")<LoggerService, Logger>() {}

const createLog = (
  level: LogLevel,
  message: string,
  defaultAttrs: Record<string, unknown>,
  attrs?: Record<string, unknown>,
): StructuredLog => ({
  level,
  message,
  timestamp: new Date().toISOString(),
  attributes: { ...defaultAttrs, ...attrs },
})

const makeLoggerImpl = (
  defaultAttrs: Record<string, unknown>,
  sink: (log: StructuredLog) => void,
): Logger => ({
  debug: (message, attrs) =>
    Effect.sync(() => sink(createLog(LOG_LEVEL.DEBUG, message, defaultAttrs, attrs))),
  info: (message, attrs) =>
    Effect.sync(() => sink(createLog(LOG_LEVEL.INFO, message, defaultAttrs, attrs))),
  warn: (message, attrs) =>
    Effect.sync(() => sink(createLog(LOG_LEVEL.WARN, message, defaultAttrs, attrs))),
  error: (message, attrs) =>
    Effect.sync(() => sink(createLog(LOG_LEVEL.ERROR, message, defaultAttrs, attrs))),
  child: (childAttrs) => makeLoggerImpl({ ...defaultAttrs, ...childAttrs }, sink),
})

export const makeConsoleLogger = (): Logger =>
  makeLoggerImpl({}, (log) => {
    const output = JSON.stringify(log)
    switch (log.level) {
      case LOG_LEVEL.ERROR:
        console.error(output)
        break
      case LOG_LEVEL.WARN:
        console.warn(output)
        break
      default:
        console.log(output)
    }
  })

export const makeBufferedLogger = (buffer: StructuredLog[]): Logger =>
  makeLoggerImpl({}, (log) => buffer.push(log))

export const ConsoleLoggerLayer = Layer.succeed(LoggerService, makeConsoleLogger())
