# Orchestrix Agents

Autonomous incident response system using holonic architecture. Five self-contained agents (holons) collaborate through a pipeline to detect, diagnose, and remediate production incidents with minimal human intervention.

Built with Effect-TS for composable domain logic, Temporal for durable workflow orchestration, Fastify for the HTTP API layer, and event-sourced graph memory for knowledge retention.

## Architecture

```
                         +-----------+
                         | Fastify   |
                         | API       |
                         +-----+-----+
                               |
                    +----------v-----------+
                    |    Coordinator        |
                    |  (saga orchestration) |
                    +----------+-----------+
                               |
         +---------------------+---------------------+
         |                     |                     |
   +-----v-----+       +------v------+       +------v------+
   | Sentinel   |------>| Diagnostician|------>|   Healer    |
   | (detect)   |       | (analyze)    |       | (remediate) |
   +-----+------+       +------+------+       +------+------+
         |                     |                     |
         +---------------------+---------------------+
                               |
                        +------v------+
                        |  Historian   |
                        |  (record)    |
                        +-------------+

   Pipeline: sentinel.detect -> coordinator.route -> diagnostician.analyze
                -> healer.remediate -> historian.record
```

## Quick Start

```bash
# Clone
git clone <repo-url> && cd orchestrix-agents

# Install dependencies (requires Node.js >= 22, pnpm)
pnpm install

# Start infrastructure (PostgreSQL, Redis, Temporal, OTel, Grafana)
cd infra && docker compose up -d && cd ..

# Run API server (dev mode with hot reload)
cd api && pnpm dev

# Run all tests
pnpm test
```

The API starts on `http://localhost:8080`.

## Holons

Each holon is a self-contained agent with `domain/`, `api/`, `infra/`, and `resilience/` layers.

| Holon           | Role                | Key Functions                                                      |
|-----------------|---------------------|--------------------------------------------------------------------|
| **Sentinel**    | Detection & intake  | Severity classification, anomaly detection, alert correlation, noise filtering |
| **Coordinator** | Orchestration       | Incident routing (DFA), SLA tracking, escalation engine            |
| **Diagnostician** | Root cause analysis | Hypothesis generation, evidence ranking, runbook matching        |
| **Healer**      | Remediation         | Blast radius assessment, approval gate, rollback engine            |
| **Historian**   | Knowledge retention | Incident recording, pattern detection, knowledge decay             |

## API Endpoints

| Method | Path                              | Description                        |
|--------|-----------------------------------|------------------------------------|
| GET    | `/health/live`                    | Liveness probe                     |
| GET    | `/health/ready`                   | Readiness probe (postgres, temporal, redis) |
| GET    | `/api/v1/incidents`               | List incidents                     |
| GET    | `/api/v1/incidents/:id`           | Get incident by ID                 |
| POST   | `/api/v1/incidents`               | Intake incident (triggers pipeline)|
| GET    | `/api/v1/graph/entities`          | List graph entities                |
| GET    | `/api/v1/graph/entities/:id/traverse` | Traverse graph from entity     |
| GET    | `/api/v1/graph/stats`             | Graph memory statistics            |

### POST /api/v1/incidents

```json
{
  "serviceId": "svc-payments",
  "serviceTier": "CRITICAL",
  "userImpactPercent": 35,
  "isServiceDown": false,
  "durationMs": 120000,
  "errorMessages": ["OOMKilled: container exceeded memory limit"],
  "alerts": [{ "source": "prometheus", "message": "high memory", "labels": {} }],
  "metrics": [{ "name": "memory_usage", "value": 95, "threshold": 80 }]
}
```

Response includes severity classification, routing decision, approval gate result, hypothesis analysis, and event count.

## Shared Packages

| Package                | Purpose                                                |
|------------------------|--------------------------------------------------------|
| `@orchestrix/shared`   | Branded types (`IncidentId`, `ServiceId`), tagged errors, domain constants |
| `@orchestrix/graph-memory` | CQRS + event sourcing graph (entities, relations, projections) |
| `@orchestrix/blueprint-engine` | DFA for incident lifecycle states, saga execution with compensation |
| `@orchestrix/holon-runtime` | Actor model (mailbox, message processing, supervisor trees) |
| `@orchestrix/circuit-breaker` | Circuit breaker (sliding window, 5 failure types) + token bucket rate limiter |
| `@orchestrix/observability` | Structured logger, metrics collector, OTel-compatible tracing |
| `@orchestrix/temporal-workflows` | Incident saga types, workflow/activity interfaces, task queues |
| `@orchestrix/incident-pipeline` | Synchronous pipeline chaining all holon domain functions |

## Graph Memory Schema

Event-sourced graph database tracking incident knowledge:

**Entity types:** `service`, `incident`, `alert`, `root_cause`, `fix`, `runbook`, `postmortem`, `team`

**Relation types:** `caused_by`, `fixed_by`, `similar_to`, `recurred_after`, `affects`, `escalated_to`, `documented_in`, `uses_runbook`

All state changes are persisted as `GraphEvent`s (`EntityCreated`, `RelationCreated`, etc.) and materialized into read-side projections.

## Incident Lifecycle (DFA)

```
DETECTED -> DIAGNOSING -> ASSESSING -> HEALING -> VERIFYING -> RESOLVED
     |           |            |           |
     +-----------+------------+-----------+---> ESCALATED
```

Transitions are validated by the blueprint engine DFA. Invalid transitions produce typed `InvalidTransition` errors.

## Tech Stack

- **Runtime:** Node.js >= 22, TypeScript 5.9 (strict mode, branded types)
- **Domain logic:** Effect-TS v3 (`Effect.gen`, `Context.Tag`, `Layer`, tagged errors)
- **Workflows:** Temporal (saga orchestration, durable execution)
- **HTTP:** Fastify 5
- **Observability:** OpenTelemetry collector, Grafana
- **Storage:** PostgreSQL 16, Redis 7
- **Testing:** Vitest 4 (264 tests)
- **Monorepo:** pnpm workspaces, TypeScript project references

## Design Patterns

- **Holonic architecture** -- self-contained agents with domain/api/infra/resilience layers
- **Functional core, imperative shell** -- pure domain functions at the center, side effects at boundaries
- **Event sourcing + CQRS** -- graph state from event replay, projections for reads
- **Saga pattern** -- multi-step remediation with compensation (rollback)
- **Circuit breaker** -- fault isolation for external service calls
- **Actor model** -- mailbox-based message processing with supervisor trees
- **Branded types** -- `IncidentId`, `ServiceId`, etc. prevent primitive confusion at compile time
- **Tagged errors** -- `IncidentNotFound`, `DiagnosisFailed`, etc. for exhaustive error handling
- **DFA state machine** -- validated incident lifecycle transitions
- **Knowledge decay** -- relation weights decrease over time, keeping the graph relevant

## Commands

```bash
pnpm test              # run all tests
pnpm build             # typecheck via tsc -b
pnpm lint              # eslint
pnpm format            # prettier

cd api && pnpm dev     # dev server with hot reload
cd api && pnpm build   # build API
cd api && pnpm start   # start built API

cd infra && docker compose up -d   # start infrastructure
```
