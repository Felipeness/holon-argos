export const RUNBOOK_CATEGORY = {
  MEMORY: "MEMORY",
  CPU: "CPU",
  DATABASE: "DATABASE",
  NETWORK: "NETWORK",
  DISK: "DISK",
  CONFIGURATION: "CONFIGURATION",
  CERTIFICATE: "CERTIFICATE",
  DEPLOYMENT: "DEPLOYMENT",
} as const

export type RunbookCategory = (typeof RUNBOOK_CATEGORY)[keyof typeof RUNBOOK_CATEGORY]

export interface RunbookEntry {
  readonly id: string
  readonly title: string
  readonly category: RunbookCategory
  readonly keywords: readonly string[]
  readonly steps: readonly string[]
}

export interface RunbookMatch {
  readonly runbook: RunbookEntry
  readonly confidence: number
  readonly matchedKeywords: readonly string[]
}

const KNOWN_RUNBOOKS: readonly RunbookEntry[] = [
  {
    id: "rb-oom-restart",
    title: "OOM Kill Recovery",
    category: RUNBOOK_CATEGORY.MEMORY,
    keywords: ["oom", "out of memory", "OOMKilled", "memory limit", "heap"],
    steps: [
      "Check pod memory usage: kubectl top pods",
      "Review memory limits in deployment spec",
      "Analyze heap dump if available",
      "Increase memory limits or fix memory leak",
      "Rolling restart of affected pods",
    ],
  },
  {
    id: "rb-cpu-throttle",
    title: "CPU Throttling Mitigation",
    category: RUNBOOK_CATEGORY.CPU,
    keywords: ["cpu throttle", "throttling", "cpu limit", "high cpu"],
    steps: [
      "Check CPU throttle metrics: container_cpu_cfs_throttled_seconds_total",
      "Review CPU limits vs requests",
      "Profile application for CPU hotspots",
      "Adjust CPU limits or optimize code",
    ],
  },
  {
    id: "rb-db-pool",
    title: "Database Connection Pool Recovery",
    category: RUNBOOK_CATEGORY.DATABASE,
    keywords: ["connection pool", "too many connections", "database", "connection refused", "connection exhausted"],
    steps: [
      "Check active connections: SELECT count(*) FROM pg_stat_activity",
      "Identify long-running queries",
      "Kill idle connections",
      "Review pool size configuration",
      "Restart connection pool",
    ],
  },
  {
    id: "rb-upstream-timeout",
    title: "Upstream Service Timeout Resolution",
    category: RUNBOOK_CATEGORY.NETWORK,
    keywords: ["timeout", "upstream", "ETIMEDOUT", "deadline exceeded", "latency"],
    steps: [
      "Identify failing upstream service",
      "Check upstream service health",
      "Review timeout configurations",
      "Enable/adjust circuit breaker",
      "Consider adding retry with backoff",
    ],
  },
  {
    id: "rb-disk-full",
    title: "Disk Space Recovery",
    category: RUNBOOK_CATEGORY.DISK,
    keywords: ["disk full", "no space left", "ENOSPC", "disk pressure", "disk usage"],
    steps: [
      "Check disk usage: df -h",
      "Find large files: du -sh /*",
      "Clean up old logs and temp files",
      "Expand volume if needed",
      "Set up disk usage alerts",
    ],
  },
  {
    id: "rb-config-change",
    title: "Configuration Drift Recovery",
    category: RUNBOOK_CATEGORY.CONFIGURATION,
    keywords: ["config", "configuration", "environment variable", "parse error", "invalid value"],
    steps: [
      "Compare current config with last known good",
      "Check recent deployment/config changes",
      "Rollback to previous configuration",
      "Validate config schema",
    ],
  },
  {
    id: "rb-cert-renewal",
    title: "TLS Certificate Renewal",
    category: RUNBOOK_CATEGORY.CERTIFICATE,
    keywords: ["certificate", "TLS", "SSL", "x509", "cert expired", "CERT_HAS_EXPIRED"],
    steps: [
      "Check certificate expiry: openssl s_client -connect host:443",
      "Renew certificate via cert-manager or manual process",
      "Update secret in k8s",
      "Restart ingress controller",
      "Verify TLS handshake",
    ],
  },
  {
    id: "rb-crash-loop",
    title: "Crash Loop Recovery",
    category: RUNBOOK_CATEGORY.DEPLOYMENT,
    keywords: ["CrashLoopBackOff", "crash loop", "restart", "exit code", "startup failure"],
    steps: [
      "Check pod events: kubectl describe pod",
      "Review container logs: kubectl logs --previous",
      "Check startup/liveness probes",
      "Rollback to last working deployment",
      "Fix root cause and redeploy",
    ],
  },
] as const

const computeConfidence = (rootCause: string, runbook: RunbookEntry): { confidence: number; matched: string[] } => {
  const normalizedCause = rootCause.toLowerCase()
  const matched = runbook.keywords.filter((kw) => normalizedCause.includes(kw.toLowerCase()))

  if (matched.length === 0) {
    return { confidence: 0, matched: [] }
  }

  const keywordCoverage = matched.length / runbook.keywords.length
  const categoryBonus = normalizedCause.includes(runbook.category.toLowerCase()) ? 0.1 : 0
  const confidence = Math.min(keywordCoverage + categoryBonus, 1)

  return { confidence, matched }
}

export const matchRunbooks = (rootCause: string): readonly RunbookMatch[] => {
  const matches = KNOWN_RUNBOOKS
    .map((runbook) => {
      const { confidence, matched } = computeConfidence(rootCause, runbook)
      return { runbook, confidence, matchedKeywords: matched }
    })
    .filter((m) => m.confidence > 0)

  return [...matches].sort((a, b) => b.confidence - a.confidence)
}
