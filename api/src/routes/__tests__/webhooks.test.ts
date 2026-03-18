import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { FastifyInstance } from "fastify"
import { buildServer } from "../../server.js"

let app: FastifyInstance

beforeEach(async () => {
  app = await buildServer()
})

afterEach(async () => {
  await app.close()
})

const postPrometheus = (body: unknown) =>
  app.inject({
    method: "POST",
    url: "/webhooks/prometheus",
    headers: { "content-type": "application/json" },
    payload: body,
  })

const postPagerDuty = (body: unknown) =>
  app.inject({
    method: "POST",
    url: "/webhooks/pagerduty",
    headers: { "content-type": "application/json" },
    payload: body,
  })

describe("POST /webhooks/prometheus", () => {
  it("processes a valid firing alert and classifies severity", async () => {
    const response = await postPrometheus({
      version: "4",
      status: "firing",
      alerts: [
        {
          status: "firing",
          labels: {
            alertname: "HighMemoryUsage",
            service: "payment-api",
            severity: "critical",
            tier: "critical",
            impact: "40",
          },
          annotations: { summary: "Payment API memory usage above 90%" },
          startsAt: new Date(Date.now() - 120_000).toISOString(),
          endsAt: "0001-01-01T00:00:00Z",
          fingerprint: "abc123",
        },
      ],
    })

    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(200)
    expect(body.processed).toBe(1)
    expect(body.groups).toBeGreaterThanOrEqual(1)
    expect(body.classifications).toHaveLength(1)
    expect(body.classifications[0].service).toBe("payment-api")
    expect(body.classifications[0].severity).toBeDefined()
    expect(body.classifications[0].autoRemediate).toBeDefined()
  })

  it("returns zero processed for resolved-only alerts", async () => {
    const response = await postPrometheus({
      version: "4",
      status: "resolved",
      alerts: [
        {
          status: "resolved",
          labels: { alertname: "HighCPU", service: "api" },
          annotations: {},
          startsAt: new Date().toISOString(),
          endsAt: new Date().toISOString(),
          fingerprint: "resolved-1",
        },
      ],
    })

    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(200)
    expect(body.processed).toBe(0)
    expect(body.classifications).toEqual([])
  })

  it("correlates and groups multiple alerts from the same service", async () => {
    const now = Date.now()
    const response = await postPrometheus({
      version: "4",
      status: "firing",
      alerts: [
        {
          status: "firing",
          labels: { alertname: "HighCPU", service: "api-gateway", severity: "warning" },
          annotations: { summary: "CPU at 85%" },
          startsAt: new Date(now - 60_000).toISOString(),
          endsAt: "0001-01-01T00:00:00Z",
          fingerprint: "fp-1",
        },
        {
          status: "firing",
          labels: { alertname: "HighCPU", service: "api-gateway", severity: "warning" },
          annotations: { summary: "CPU at 90%" },
          startsAt: new Date(now - 30_000).toISOString(),
          endsAt: "0001-01-01T00:00:00Z",
          fingerprint: "fp-2",
        },
        {
          status: "firing",
          labels: { alertname: "HighMemory", service: "payment-svc", severity: "critical" },
          annotations: { summary: "Memory at 95%" },
          startsAt: new Date(now - 45_000).toISOString(),
          endsAt: "0001-01-01T00:00:00Z",
          fingerprint: "fp-3",
        },
      ],
    })

    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(200)
    expect(body.processed).toBe(3)
    expect(body.groups).toBe(2) // api-gateway::HighCPU + payment-svc::HighMemory
    expect(body.classifications).toHaveLength(2)
  })

  it("returns 400 for empty alerts array", async () => {
    const response = await postPrometheus({
      version: "4",
      status: "firing",
      alerts: [],
    })

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
  })

  it("classifies critical tier with high impact as P1", async () => {
    const response = await postPrometheus({
      version: "4",
      status: "firing",
      alerts: [
        {
          status: "firing",
          labels: {
            alertname: "ServiceDown",
            service: "checkout",
            severity: "critical",
            tier: "critical",
            impact: "80",
          },
          annotations: { summary: "Checkout service is down" },
          startsAt: new Date(Date.now() - 300_000).toISOString(),
          endsAt: "0001-01-01T00:00:00Z",
          fingerprint: "fp-down",
        },
      ],
    })

    const body = JSON.parse(response.body)

    expect(body.classifications[0].severity).toBe("P1")
    expect(body.classifications[0].autoRemediate).toBe(true)
  })

  it("classifies low-severity info alerts as P4", async () => {
    const response = await postPrometheus({
      version: "4",
      status: "firing",
      alerts: [
        {
          status: "firing",
          labels: {
            alertname: "DiskUsage",
            service: "logger",
            severity: "info",
            impact: "0",
          },
          annotations: { summary: "Disk usage at 60%" },
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          endsAt: "0001-01-01T00:00:00Z",
          fingerprint: "fp-info",
        },
      ],
    })

    const body = JSON.parse(response.body)

    expect(body.classifications[0].severity).toBe("P5")
    expect(body.classifications[0].autoRemediate).toBe(false)
  })
})

describe("POST /webhooks/pagerduty", () => {
  it("processes a triggered incident and classifies severity", async () => {
    const response = await postPagerDuty({
      event: {
        id: "evt-123",
        event_type: "incident.triggered",
        resource_type: "incident",
        occurred_at: new Date().toISOString(),
        data: {
          id: "inc-456",
          type: "incident",
          title: "High CPU on checkout service",
          status: "triggered",
          urgency: "high",
          service: { id: "svc-1", name: "checkout-service" },
        },
      },
    })

    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(200)
    expect(body.processed).toBe(true)
    expect(body.incidentId).toBe("inc-456")
    expect(body.title).toBe("High CPU on checkout service")
    expect(body.service).toBe("checkout-service")
    expect(body.severity).toBeDefined()
    expect(body.autoRemediate).toBeDefined()
    expect(body.reason).toBeDefined()
  })

  it("ignores acknowledged events", async () => {
    const response = await postPagerDuty({
      event: {
        id: "evt-789",
        event_type: "incident.acknowledged",
        resource_type: "incident",
        occurred_at: new Date().toISOString(),
        data: {
          id: "inc-789",
          type: "incident",
          title: "Some incident",
          status: "acknowledged",
          urgency: "high",
          service: { id: "svc-1", name: "api" },
        },
      },
    })

    const body = JSON.parse(response.body)

    expect(response.statusCode).toBe(200)
    expect(body.processed).toBe(false)
    expect(body.reason).toContain("incident.acknowledged")
  })

  it("ignores resolved events", async () => {
    const response = await postPagerDuty({
      event: {
        id: "evt-resolved",
        event_type: "incident.resolved",
        resource_type: "incident",
        occurred_at: new Date().toISOString(),
        data: {
          id: "inc-resolved",
          type: "incident",
          title: "Resolved incident",
          status: "resolved",
          urgency: "low",
          service: { id: "svc-2", name: "background-worker" },
        },
      },
    })

    const body = JSON.parse(response.body)

    expect(body.processed).toBe(false)
    expect(body.reason).toContain("incident.resolved")
  })

  it("classifies high urgency as P1/P2 with auto-remediation", async () => {
    const response = await postPagerDuty({
      event: {
        id: "evt-high",
        event_type: "incident.triggered",
        resource_type: "incident",
        occurred_at: new Date().toISOString(),
        data: {
          id: "inc-high",
          type: "incident",
          title: "Database connection pool exhausted",
          status: "triggered",
          urgency: "high",
          service: { id: "svc-db", name: "database-primary" },
        },
      },
    })

    const body = JSON.parse(response.body)

    expect(["P1", "P2"]).toContain(body.severity)
    expect(body.autoRemediate).toBe(true)
  })

  it("classifies low urgency as P4/P5 without auto-remediation", async () => {
    const response = await postPagerDuty({
      event: {
        id: "evt-low",
        event_type: "incident.triggered",
        resource_type: "incident",
        occurred_at: new Date().toISOString(),
        data: {
          id: "inc-low",
          type: "incident",
          title: "Certificate expiring in 30 days",
          status: "triggered",
          urgency: "low",
          service: { id: "svc-cert", name: "cert-manager" },
        },
      },
    })

    const body = JSON.parse(response.body)

    expect(["P4", "P5"]).toContain(body.severity)
    expect(body.autoRemediate).toBe(false)
  })

  it("returns 400 for missing event field", async () => {
    const response = await postPagerDuty({})

    expect(response.statusCode).toBe(400)
    const body = JSON.parse(response.body)
    expect(body.error).toBeDefined()
  })
})
