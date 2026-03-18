import { describe, it, expect } from "vitest"
import { Effect, Exit, Layer } from "effect"
import { GraphMemoryService, GraphMemoryLayer, InMemoryEventStoreLayer } from "../src/index.js"
import { ENTITY_TYPES, RELATION_TYPES } from "@argos/shared"

const TestLayer = GraphMemoryLayer.pipe(Layer.provide(InMemoryEventStoreLayer))

const runTest = <E, A>(effect: Effect.Effect<A, E, GraphMemoryService>) =>
  Effect.runPromise(Effect.provide(effect, TestLayer))

const runTestExit = <E, A>(effect: Effect.Effect<A, E, GraphMemoryService>) =>
  Effect.runPromise(Effect.exit(Effect.provide(effect, TestLayer)))

describe("GraphMemory", () => {
  describe("createEntity", () => {
    it("creates an entity and returns it", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          return yield* graph.createEntity({
            id: "svc-1",
            type: ENTITY_TYPES.SERVICE,
            name: "api-gateway",
            metadata: { region: "us-east-1" },
          })
        }),
      )

      expect(result.id).toBe("svc-1")
      expect(result.type).toBe("service")
      expect(result.name).toBe("api-gateway")
      expect(result.metadata).toEqual({ region: "us-east-1" })
      expect(result.createdAt).toBeTypeOf("number")
    })

    it("rejects duplicate entity ids", async () => {
      const exit = await runTestExit(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "svc-dup",
            type: ENTITY_TYPES.SERVICE,
            name: "dup-service",
          })
          return yield* graph.createEntity({
            id: "svc-dup",
            type: ENTITY_TYPES.SERVICE,
            name: "dup-service-2",
          })
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("getEntity", () => {
    it("retrieves an existing entity", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "svc-get",
            type: ENTITY_TYPES.SERVICE,
            name: "get-test",
          })
          return yield* graph.getEntity("svc-get")
        }),
      )

      expect(result.id).toBe("svc-get")
      expect(result.name).toBe("get-test")
    })

    it("fails when entity does not exist", async () => {
      const exit = await runTestExit(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          return yield* graph.getEntity("nonexistent")
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("updateEntity", () => {
    it("merges metadata on update", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "svc-upd",
            type: ENTITY_TYPES.SERVICE,
            name: "update-test",
            metadata: { region: "us-east-1" },
          })
          return yield* graph.updateEntity({
            id: "svc-upd",
            metadata: { version: "2.0" },
          })
        }),
      )

      expect(result.metadata).toEqual({ region: "us-east-1", version: "2.0" })
      expect(result.updatedAt).toBeGreaterThanOrEqual(result.createdAt)
    })

    it("fails when entity does not exist", async () => {
      const exit = await runTestExit(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          return yield* graph.updateEntity({
            id: "nonexistent",
            metadata: { foo: "bar" },
          })
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("deleteEntity", () => {
    it("removes entity from graph", async () => {
      const exit = await runTestExit(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "svc-del",
            type: ENTITY_TYPES.SERVICE,
            name: "delete-test",
          })
          yield* graph.deleteEntity("svc-del")
          return yield* graph.getEntity("svc-del")
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("relations", () => {
    it("creates a relation between entities", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "inc-1",
            type: ENTITY_TYPES.INCIDENT,
            name: "high-cpu",
          })
          yield* graph.createEntity({
            id: "rc-1",
            type: ENTITY_TYPES.ROOT_CAUSE,
            name: "memory-leak",
          })
          return yield* graph.createRelation({
            id: "rel-1",
            type: RELATION_TYPES.CAUSED_BY,
            fromEntityId: "inc-1",
            toEntityId: "rc-1",
          })
        }),
      )

      expect(result.id).toBe("rel-1")
      expect(result.type).toBe("caused_by")
      expect(result.fromEntityId).toBe("inc-1")
      expect(result.toEntityId).toBe("rc-1")
    })

    it("fails when source entity does not exist", async () => {
      const exit = await runTestExit(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "target-1",
            type: ENTITY_TYPES.SERVICE,
            name: "target",
          })
          return yield* graph.createRelation({
            id: "rel-bad",
            type: RELATION_TYPES.AFFECTS,
            fromEntityId: "nonexistent",
            toEntityId: "target-1",
          })
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })

  describe("queryEntities", () => {
    it("filters entities by type", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "svc-q1",
            type: ENTITY_TYPES.SERVICE,
            name: "service-1",
          })
          yield* graph.createEntity({
            id: "inc-q1",
            type: ENTITY_TYPES.INCIDENT,
            name: "incident-1",
          })
          yield* graph.createEntity({
            id: "svc-q2",
            type: ENTITY_TYPES.SERVICE,
            name: "service-2",
          })
          return yield* graph.queryEntities({ entityType: ENTITY_TYPES.SERVICE })
        }),
      )

      expect(result).toHaveLength(2)
      expect(result.every((e) => e.type === "service")).toBe(true)
    })

    it("filters entities by name pattern", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "svc-np1",
            type: ENTITY_TYPES.SERVICE,
            name: "api-gateway",
          })
          yield* graph.createEntity({
            id: "svc-np2",
            type: ENTITY_TYPES.SERVICE,
            name: "api-users",
          })
          yield* graph.createEntity({
            id: "svc-np3",
            type: ENTITY_TYPES.SERVICE,
            name: "worker-process",
          })
          return yield* graph.queryEntities({ namePattern: "api" })
        }),
      )

      expect(result).toHaveLength(2)
    })

    it("respects limit", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "e-lim1",
            type: ENTITY_TYPES.SERVICE,
            name: "s1",
          })
          yield* graph.createEntity({
            id: "e-lim2",
            type: ENTITY_TYPES.SERVICE,
            name: "s2",
          })
          yield* graph.createEntity({
            id: "e-lim3",
            type: ENTITY_TYPES.SERVICE,
            name: "s3",
          })
          return yield* graph.queryEntities({ limit: 2 })
        }),
      )

      expect(result).toHaveLength(2)
    })
  })

  describe("queryRelations", () => {
    it("filters relations by type", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "e-qr1",
            type: ENTITY_TYPES.INCIDENT,
            name: "i1",
          })
          yield* graph.createEntity({
            id: "e-qr2",
            type: ENTITY_TYPES.ROOT_CAUSE,
            name: "rc1",
          })
          yield* graph.createEntity({
            id: "e-qr3",
            type: ENTITY_TYPES.FIX,
            name: "f1",
          })
          yield* graph.createRelation({
            id: "r-qr1",
            type: RELATION_TYPES.CAUSED_BY,
            fromEntityId: "e-qr1",
            toEntityId: "e-qr2",
          })
          yield* graph.createRelation({
            id: "r-qr2",
            type: RELATION_TYPES.FIXED_BY,
            fromEntityId: "e-qr1",
            toEntityId: "e-qr3",
          })
          return yield* graph.queryRelations({ relationType: RELATION_TYPES.CAUSED_BY })
        }),
      )

      expect(result).toHaveLength(1)
      expect(result[0]!.type).toBe("caused_by")
    })
  })

  describe("traverse", () => {
    it("traverses outbound relations", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "t-1",
            type: ENTITY_TYPES.INCIDENT,
            name: "root-incident",
          })
          yield* graph.createEntity({
            id: "t-2",
            type: ENTITY_TYPES.ROOT_CAUSE,
            name: "cause-1",
          })
          yield* graph.createEntity({
            id: "t-3",
            type: ENTITY_TYPES.FIX,
            name: "fix-1",
          })
          yield* graph.createRelation({
            id: "tr-1",
            type: RELATION_TYPES.CAUSED_BY,
            fromEntityId: "t-1",
            toEntityId: "t-2",
          })
          yield* graph.createRelation({
            id: "tr-2",
            type: RELATION_TYPES.FIXED_BY,
            fromEntityId: "t-2",
            toEntityId: "t-3",
          })
          return yield* graph.traverse({
            startEntityId: "t-1",
            maxDepth: 3,
            direction: "outbound",
          })
        }),
      )

      expect(result).toHaveLength(3)
      expect(result[0]!.depth).toBe(0)
      expect(result[0]!.entity.id).toBe("t-1")
      expect(result[1]!.depth).toBe(1)
      expect(result[2]!.depth).toBe(2)
    })

    it("respects maxDepth", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "d-1",
            type: ENTITY_TYPES.SERVICE,
            name: "s1",
          })
          yield* graph.createEntity({
            id: "d-2",
            type: ENTITY_TYPES.SERVICE,
            name: "s2",
          })
          yield* graph.createEntity({
            id: "d-3",
            type: ENTITY_TYPES.SERVICE,
            name: "s3",
          })
          yield* graph.createRelation({
            id: "dr-1",
            type: RELATION_TYPES.AFFECTS,
            fromEntityId: "d-1",
            toEntityId: "d-2",
          })
          yield* graph.createRelation({
            id: "dr-2",
            type: RELATION_TYPES.AFFECTS,
            fromEntityId: "d-2",
            toEntityId: "d-3",
          })
          return yield* graph.traverse({
            startEntityId: "d-1",
            maxDepth: 1,
            direction: "outbound",
          })
        }),
      )

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.entity.id)).toEqual(["d-1", "d-2"])
    })

    it("filters by relation type during traversal", async () => {
      const result = await runTest(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          yield* graph.createEntity({
            id: "ft-1",
            type: ENTITY_TYPES.INCIDENT,
            name: "inc",
          })
          yield* graph.createEntity({
            id: "ft-2",
            type: ENTITY_TYPES.ROOT_CAUSE,
            name: "cause",
          })
          yield* graph.createEntity({
            id: "ft-3",
            type: ENTITY_TYPES.FIX,
            name: "fix",
          })
          yield* graph.createRelation({
            id: "ftr-1",
            type: RELATION_TYPES.CAUSED_BY,
            fromEntityId: "ft-1",
            toEntityId: "ft-2",
          })
          yield* graph.createRelation({
            id: "ftr-2",
            type: RELATION_TYPES.FIXED_BY,
            fromEntityId: "ft-1",
            toEntityId: "ft-3",
          })
          return yield* graph.traverse({
            startEntityId: "ft-1",
            relationType: RELATION_TYPES.CAUSED_BY,
            maxDepth: 3,
            direction: "outbound",
          })
        }),
      )

      expect(result).toHaveLength(2)
      expect(result.map((r) => r.entity.id)).toEqual(["ft-1", "ft-2"])
    })

    it("fails when start entity does not exist", async () => {
      const exit = await runTestExit(
        Effect.gen(function* () {
          const graph = yield* GraphMemoryService
          return yield* graph.traverse({
            startEntityId: "nonexistent",
            maxDepth: 1,
          })
        }),
      )

      expect(Exit.isFailure(exit)).toBe(true)
    })
  })
})
