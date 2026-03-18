import { describe, it, expect } from "vitest"
import { buildServer } from "../../server.js"

describe("health routes", () => {
  it("returns alive on /health/live", async () => {
    const app = await buildServer()
    const response = await app.inject({ method: "GET", url: "/health/live" })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe("alive")
    await app.close()
  })

  it("returns ready on /health/ready", async () => {
    const app = await buildServer()
    const response = await app.inject({ method: "GET", url: "/health/ready" })
    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body.status).toBe("ready")
    await app.close()
  })
})
