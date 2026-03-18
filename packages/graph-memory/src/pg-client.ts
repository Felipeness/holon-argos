import { Context, Effect, Layer } from "effect"
import pg from "pg"

export class PgError {
  readonly _tag = "PgError" as const
  constructor(
    readonly message: string,
    readonly cause?: unknown,
  ) {}
}

export interface PgClientService {
  readonly query: (sql: string, params?: unknown[]) => Effect.Effect<pg.QueryResult, PgError>
  readonly end: () => Effect.Effect<void>
}

export class PgClient extends Context.Tag("PgClient")<PgClient, PgClientService>() {}

export const PgClientLive = (connectionString: string) =>
  Layer.scoped(
    PgClient,
    Effect.acquireRelease(
      Effect.try({
        try: () => {
          const pool = new pg.Pool({ connectionString })
          return {
            query: (sql: string, params?: unknown[]) =>
              Effect.tryPromise({
                try: () => pool.query(sql, params),
                catch: (err) => new PgError(String(err), err),
              }),
            end: () => Effect.promise(() => pool.end()),
          }
        },
        catch: (err) => new PgError(`Connection failed: ${err}`, err),
      }),
      (client) => client.end(),
    ),
  )
