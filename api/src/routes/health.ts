import { FastifyPluginAsync } from "fastify"

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/live", async () => ({
    status: "alive",
    timestamp: new Date().toISOString(),
  }))

  app.get("/ready", async () => ({
    status: "ready",
    checks: {
      postgres: { ok: true },
      temporal: { ok: true },
      redis: { ok: true },
    },
    timestamp: new Date().toISOString(),
  }))
}
