import { FastifyPluginAsync } from "fastify"

type IncidentParams = { id: string }

export const incidentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (_request, _reply) => {
    // TODO: wire to historian holon
    return { incidents: [], total: 0, page: 1, limit: 20 }
  })

  app.get<{ Params: IncidentParams }>("/:id", async (request, _reply) => {
    const { id } = request.params
    // TODO: wire to historian holon
    return {
      id,
      status: "DETECTED",
      severity: "P3",
      detected_at: new Date().toISOString(),
    }
  })

  app.post("/", async (_request, reply) => {
    // TODO: wire to sentinel holon intake
    reply.status(202)
    return { accepted: true, message: "Incident intake queued" }
  })
}
