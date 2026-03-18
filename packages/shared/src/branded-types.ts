import { Brand } from "effect"

export type IncidentId = string & Brand.Brand<"IncidentId">
export const IncidentId = Brand.nominal<IncidentId>()

export type AlertId = string & Brand.Brand<"AlertId">
export const AlertId = Brand.nominal<AlertId>()

export type ServiceId = string & Brand.Brand<"ServiceId">
export const ServiceId = Brand.nominal<ServiceId>()

export type RunbookId = string & Brand.Brand<"RunbookId">
export const RunbookId = Brand.nominal<RunbookId>()

export type AlertFingerprint = string & Brand.Brand<"AlertFingerprint">
export const AlertFingerprint = Brand.nominal<AlertFingerprint>()

export type HolonId = string & Brand.Brand<"HolonId">
export const HolonId = Brand.nominal<HolonId>()

export type CorrelationId = string & Brand.Brand<"CorrelationId">
export const CorrelationId = Brand.nominal<CorrelationId>()

export type EntityId = string & Brand.Brand<"EntityId">
export const EntityId = Brand.nominal<EntityId>()

export type RelationId = string & Brand.Brand<"RelationId">
export const RelationId = Brand.nominal<RelationId>()
