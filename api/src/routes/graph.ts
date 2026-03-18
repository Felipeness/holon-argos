import { FastifyPluginAsync } from "fastify"

type EntityParams = { id: string }
type TraverseQuery = { depth?: string; direction?: string }

export const graphRoutes: FastifyPluginAsync = async (app) => {
  app.get("/entities", async () => {
    // TODO: wire to graph-memory queries
    return { entities: [], total: 0 }
  })

  app.get<{ Params: EntityParams; Querystring: TraverseQuery }>(
    "/entities/:id/traverse",
    async (request) => {
      const { id } = request.params
      const depth = parseInt(request.query.depth ?? "2", 10)
      // TODO: wire to graph-memory traverse
      return { start: id, depth, paths: [] }
    },
  )

  app.get("/stats", async () => {
    // TODO: wire to graph-memory
    return { entities: 0, relations: 0, events: 0 }
  })
}
