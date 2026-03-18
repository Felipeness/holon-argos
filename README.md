# orchestrix-agents

[![Tests](https://img.shields.io/badge/tests-264%20passing-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)]()
[![Effect-TS](https://img.shields.io/badge/Effect--TS-v3-purple)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

## O que é isso? / What is this?

Quando um sistema cai às 3h da manhã, alguém precisa acordar, olhar logs, entender o que aconteceu, aplicar um fix e verificar se funcionou. O orchestrix-agents faz tudo isso sozinho.

É um sistema de agentes de IA que monitora sua infraestrutura, detecta problemas automaticamente, descobre a causa raiz usando inteligência artificial, e aplica a correção — tudo sem intervenção humana para incidentes críticos. Para problemas menores, ele diagnostica e pede aprovação antes de agir.

Cada agente é um holon especializado: o sentinel vigia, o diagnostician investiga, o healer corrige, e o historian aprende com cada incidente para ser mais inteligente no próximo.

---

When a system goes down at 3 AM, someone needs to wake up, check logs, understand what happened, apply a fix, and verify it worked. orchestrix-agents does all of this automatically.

It's an AI agent system that monitors your infrastructure, detects problems automatically, discovers root causes using artificial intelligence, and applies fixes — all without human intervention for critical incidents. For less severe issues, it diagnoses and asks for approval before acting.

Each agent is a specialized holon: the sentinel watches, the diagnostician investigates, the healer fixes, and the historian learns from each incident to be smarter next time.

---

## O problema que resolve / The problem it solves

Incidentes de produção custam caro — em tempo, em dinheiro e em sono. O MTTR (tempo médio de resolução) médio da indústria é de horas. Com agentes holonômicos que aprendem com incidentes passados via memória em grafo, o orchestrix-agents pode reduzir esse tempo para minutos.

Production incidents are expensive — in time, money, and sleep. The industry average MTTR (Mean Time to Resolve) is hours. With holonomic agents that learn from past incidents via graph memory, orchestrix-agents can reduce this to minutes.

---

## Como funciona (resumo visual) / How it works (visual summary)

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

---

## Arquitetura / Architecture

Each holon is a self-contained agent with `domain/`, `api/`, `infra/`, and `resilience/` layers.

| Holon | Role | Key Functions |
|-------|------|---------------|
| **Sentinel** | Deteccao e intake / Detection & intake | Severity classification, anomaly detection, alert correlation, noise filtering |
| **Coordinator** | Orquestracao / Orchestration | Incident routing (DFA), SLA tracking, escalation engine |
| **Diagnostician** | Analise de causa raiz / Root cause analysis | Hypothesis generation, evidence ranking, runbook matching |
| **Healer** | Remediacao / Remediation | Blast radius assessment, approval gate, rollback engine |
| **Historian** | Retencao de conhecimento / Knowledge retention | Incident recording, pattern detection, knowledge decay |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js >= 22, TypeScript 5.9 (strict mode, branded types) |
| Domain logic | Effect-TS v3 (`Effect.gen`, `Context.Tag`, `Layer`, tagged errors) |
| Workflows | Temporal (saga orchestration, durable execution) |
| HTTP | Fastify 5 |
| Observability | OpenTelemetry collector, Grafana |
| Storage | PostgreSQL 16, Redis 7 |
| Testing | Vitest 4 |
| Monorepo | pnpm workspaces, TypeScript project references |

---

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

---

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

---

## Estrutura do Projeto / Project Structure

### Shared Packages

| Package | Purpose |
|---------|---------|
| `@orchestrix/shared` | Branded types (`IncidentId`, `ServiceId`), tagged errors, domain constants |
| `@orchestrix/graph-memory` | CQRS + event sourcing graph (entities, relations, projections) |
| `@orchestrix/blueprint-engine` | DFA for incident lifecycle states, saga execution with compensation |
| `@orchestrix/holon-runtime` | Actor model (mailbox, message processing, supervisor trees) |
| `@orchestrix/circuit-breaker` | Circuit breaker (sliding window, 5 failure types) + token bucket rate limiter |
| `@orchestrix/observability` | Structured logger, metrics collector, OTel-compatible tracing |
| `@orchestrix/temporal-workflows` | Incident saga types, workflow/activity interfaces, task queues |
| `@orchestrix/incident-pipeline` | Synchronous pipeline chaining all holon domain functions |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe (postgres, temporal, redis) |
| GET | `/api/v1/incidents` | List incidents |
| GET | `/api/v1/incidents/:id` | Get incident by ID |
| POST | `/api/v1/incidents` | Intake incident (triggers pipeline) |
| GET | `/api/v1/graph/entities` | List graph entities |
| GET | `/api/v1/graph/entities/:id/traverse` | Traverse graph from entity |
| GET | `/api/v1/graph/stats` | Graph memory statistics |

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

### Demo

```bash
# Start the API
npx tsx api/src/server.ts &
sleep 3

# Health check
curl -s http://localhost:8080/health/live
# => {"status":"alive","timestamp":"..."}

# Create incident with full pipeline
curl -s -X POST http://localhost:8080/api/v1/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "svc-payments",
    "serviceTier": "CRITICAL",
    "userImpactPercent": 35,
    "isServiceDown": false,
    "durationMs": 120000,
    "errorMessages": ["OOMKilled: container exceeded memory limit"],
    "alerts": [{"source": "prometheus", "message": "high memory", "labels": {}}],
    "metrics": [{"name": "memory_usage", "value": 95, "threshold": 80}]
  }'
```

Response (full pipeline output):

```json
{
  "accepted": true,
  "incidentId": "inc-1773805474077",
  "classification": {
    "severity": "P1",
    "autoRemediate": true,
    "reason": "P1 — 35% users affected, tier: CRITICAL, duration: 120s"
  },
  "routing": {
    "currentStatus": "DETECTED",
    "targetHolon": "sentinel"
  },
  "approval": {
    "decision": "auto_approved",
    "reason": "severity P1 qualifies for auto-approval (immediate action needed)"
  },
  "diagnosis": {
    "hypotheses": 1,
    "topHypothesis": {
      "id": "oom-kill",
      "description": "Out of memory: process killed by OOM killer",
      "likelihood": 0.9,
      "evidenceNeeded": ["container memory usage", "pod restart count", "heap dump analysis"]
    },
    "runbooks": 1
  },
  "timeline": {
    "eventsRecorded": 4
  }
}
```

The response shows the full incident pipeline: severity classification (P1), routing decision, auto-approval for critical incidents, root cause hypothesis with evidence needed, and event count from the historian.

---

## Graph Memory Schema

Event-sourced graph database tracking incident knowledge:

**Entity types:** `service`, `incident`, `alert`, `root_cause`, `fix`, `runbook`, `postmortem`, `team`

**Relation types:** `caused_by`, `fixed_by`, `similar_to`, `recurred_after`, `affects`, `escalated_to`, `documented_in`, `uses_runbook`

All state changes are persisted as `GraphEvent`s (`EntityCreated`, `RelationCreated`, etc.) and materialized into read-side projections.

---

## Incident Lifecycle (DFA)

```
DETECTED -> DIAGNOSING -> ASSESSING -> HEALING -> VERIFYING -> RESOLVED
     |           |            |           |
     +-----------+------------+-----------+---> ESCALATED
```

Transitions are validated by the blueprint engine DFA. Invalid transitions produce typed `InvalidTransition` errors.

---

## Testes / Tests

264 testes passando / 264 tests passing

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
