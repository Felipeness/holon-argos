# Orchestrix Agents

Autonomous incident response system using holonic architecture, Effect-TS, Temporal, and Claude Agent SDK.

## Architecture

TypeScript + Go monorepo. TypeScript handles domain logic (Effect-TS), workflow orchestration (Temporal), and agent intelligence. Go provides the HTTP API layer.

### Packages (packages/*)

- **shared** - Branded types, tagged errors, domain constants
- **graph-memory** - CQRS + Event Sourcing graph database (entities, relations, traversal)
- **blueprint-engine** - DFA for incident lifecycle, saga execution with compensation
- **holon-runtime** - Actor model (mailbox, message processing, supervisor trees)
- **circuit-breaker** - Circuit breaker (5 failure types, sliding window) + token bucket rate limiter
- **observability** - Structured logger, metrics collector, tracing (OTel-compatible interfaces)
- **temporal-workflows** - Incident saga types, workflow/activity interfaces, task queues

### Holons (holons/*)

Each holon is a self-contained agent with domain/api/infra/resilience layers:

- **sentinel** - Alert ingestion, deduplication, correlation
- **diagnostician** - Root cause analysis, similar incident lookup
- **healer** - Remediation planning, step execution, rollback, verification
- **historian** - Postmortem generation, incident timeline, knowledge graph
- **coordinator** - Saga orchestration, escalation, active incident management

### Go API (api/)

Minimal HTTP server with `/health`, `/api/v1/incidents` endpoints. Stub for now.

## Commands

```bash
pnpm test          # run all tests
pnpm build         # typecheck via tsc -b
pnpm lint          # eslint
pnpm format        # prettier

cd api && go build ./...   # build Go API
cd api && go test ./...    # test Go API
```

## Infrastructure

```bash
cd infra && docker compose up -d
```

Services: PostgreSQL 16, Redis 7, Temporal (server + UI on :8233), OTel collector, Grafana (:3000)

## Conventions

- Effect-TS v3 patterns: `Effect.gen`, `Context.Tag`, `Layer`, `Ref`, `Queue`
- Branded types for all domain IDs (never raw strings)
- Tagged errors for all domain failures
- `as const` objects over TypeScript enums
- Event sourcing for graph state, projections for reads
- Saga pattern with compensation for multi-step operations
- Circuit breaker wraps all external calls
