import Fastify from "fastify"
import cors from "@fastify/cors"
import { healthRoutes } from "./routes/health.js"
import { incidentRoutes } from "./routes/incidents.js"
import { graphRoutes } from "./routes/graph.js"
import { webhookRoutes } from "./routes/webhooks.js"

const buildServer = async () => {
  const app = Fastify({ logger: true })

  await app.register(cors)
  await app.register(healthRoutes, { prefix: "/health" })
  await app.register(incidentRoutes, { prefix: "/api/v1/incidents" })
  await app.register(graphRoutes, { prefix: "/api/v1/graph" })
  await app.register(webhookRoutes, { prefix: "/webhooks" })

  return app
}

const start = async () => {
  const app = await buildServer()
  await app.listen({ port: 8080, host: "0.0.0.0" })
}

start()

export { buildServer }
