import type { Severity } from "@orchestrix/shared"

export interface IncidentData {
  readonly serviceId: string
  readonly severity: Severity
  readonly alerts: readonly AlertSignal[]
  readonly metrics: readonly MetricSignal[]
  readonly errorMessages: readonly string[]
}

export interface AlertSignal {
  readonly source: string
  readonly message: string
  readonly labels: Record<string, string>
}

export interface MetricSignal {
  readonly name: string
  readonly value: number
  readonly threshold: number
}

export interface Hypothesis {
  readonly id: string
  readonly description: string
  readonly likelihood: number
  readonly evidenceNeeded: readonly string[]
}

interface PatternRule {
  readonly id: string
  readonly description: string
  readonly baseLikelihood: number
  readonly evidenceNeeded: readonly string[]
  readonly matches: (data: IncidentData) => boolean
}

const containsAny = (text: string, keywords: readonly string[]): boolean =>
  keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()))

const anyMessageContains = (messages: readonly string[], keywords: readonly string[]): boolean =>
  messages.some((msg) => containsAny(msg, keywords))

const anyAlertContains = (alerts: readonly AlertSignal[], keywords: readonly string[]): boolean =>
  alerts.some((a) => containsAny(a.message, keywords))

const PATTERN_RULES: readonly PatternRule[] = [
  {
    id: "oom-kill",
    description: "Out of memory: process killed by OOM killer",
    baseLikelihood: 0.85,
    evidenceNeeded: ["container memory usage", "pod restart count", "heap dump analysis"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["OOMKilled", "out of memory", "oom"]) ||
      anyAlertContains(data.alerts, ["OOMKilled", "memory limit"]),
  },
  {
    id: "cpu-throttle",
    description: "CPU throttling causing request timeouts",
    baseLikelihood: 0.7,
    evidenceNeeded: ["CPU throttle metrics", "request latency histogram", "pod CPU limits"],
    matches: (data) =>
      data.metrics.some((m) => m.name.includes("cpu") && m.value > m.threshold) ||
      anyMessageContains(data.errorMessages, ["throttl", "cpu limit"]),
  },
  {
    id: "db-connection-exhaustion",
    description: "Database connection pool exhausted",
    baseLikelihood: 0.8,
    evidenceNeeded: ["connection pool metrics", "database slow query log", "active connections count"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["connection pool", "too many connections", "connection refused"]) ||
      anyAlertContains(data.alerts, ["connection pool", "database"]),
  },
  {
    id: "upstream-timeout",
    description: "Upstream service timeout propagating failures",
    baseLikelihood: 0.75,
    evidenceNeeded: ["upstream service health", "network latency", "circuit breaker state"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["timeout", "ETIMEDOUT", "deadline exceeded", "upstream"]) ||
      anyAlertContains(data.alerts, ["timeout", "latency"]),
  },
  {
    id: "disk-pressure",
    description: "Disk space exhaustion causing write failures",
    baseLikelihood: 0.8,
    evidenceNeeded: ["disk usage percentage", "inode usage", "write error logs"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["no space left", "disk full", "ENOSPC"]) ||
      data.metrics.some((m) => m.name.includes("disk") && m.value > m.threshold),
  },
  {
    id: "config-drift",
    description: "Configuration change caused unexpected behavior",
    baseLikelihood: 0.6,
    evidenceNeeded: ["recent config changes", "deployment history", "env variable diff"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["config", "environment", "invalid value", "parse error"]) ||
      anyAlertContains(data.alerts, ["config", "deployment"]),
  },
  {
    id: "certificate-expiry",
    description: "TLS certificate expired or invalid",
    baseLikelihood: 0.9,
    evidenceNeeded: ["certificate expiry date", "TLS handshake logs"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["certificate", "TLS", "SSL", "x509", "CERT_HAS_EXPIRED"]),
  },
  {
    id: "crash-loop",
    description: "Application crash loop due to startup failure",
    baseLikelihood: 0.85,
    evidenceNeeded: ["pod restart count", "container exit codes", "startup probe logs"],
    matches: (data) =>
      anyMessageContains(data.errorMessages, ["CrashLoopBackOff", "crash loop", "restart"]) ||
      anyAlertContains(data.alerts, ["CrashLoopBackOff", "restart"]),
  },
] as const

const severityBoost = (severity: Severity): number => {
  const boosts: Record<Severity, number> = {
    P1: 0.05,
    P2: 0.03,
    P3: 0.0,
    P4: -0.02,
    P5: -0.05,
  }
  return boosts[severity]
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export const generateHypotheses = (data: IncidentData): readonly Hypothesis[] => {
  const matched = PATTERN_RULES
    .filter((rule) => rule.matches(data))
    .map((rule) => ({
      id: rule.id,
      description: rule.description,
      likelihood: clamp(rule.baseLikelihood + severityBoost(data.severity), 0, 1),
      evidenceNeeded: rule.evidenceNeeded,
    }))

  return [...matched].sort((a, b) => b.likelihood - a.likelihood)
}
