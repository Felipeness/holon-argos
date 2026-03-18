const containsAny = (text, keywords) => keywords.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
const anyMessageContains = (messages, keywords) => messages.some((msg) => containsAny(msg, keywords));
const anyAlertContains = (alerts, keywords) => alerts.some((a) => containsAny(a.message, keywords));
const PATTERN_RULES = [
    {
        id: "oom-kill",
        description: "Out of memory: process killed by OOM killer",
        baseLikelihood: 0.85,
        evidenceNeeded: ["container memory usage", "pod restart count", "heap dump analysis"],
        matches: (data) => anyMessageContains(data.errorMessages, ["OOMKilled", "out of memory", "oom"]) ||
            anyAlertContains(data.alerts, ["OOMKilled", "memory limit"]),
    },
    {
        id: "cpu-throttle",
        description: "CPU throttling causing request timeouts",
        baseLikelihood: 0.7,
        evidenceNeeded: ["CPU throttle metrics", "request latency histogram", "pod CPU limits"],
        matches: (data) => data.metrics.some((m) => m.name.includes("cpu") && m.value > m.threshold) ||
            anyMessageContains(data.errorMessages, ["throttl", "cpu limit"]),
    },
    {
        id: "db-connection-exhaustion",
        description: "Database connection pool exhausted",
        baseLikelihood: 0.8,
        evidenceNeeded: ["connection pool metrics", "database slow query log", "active connections count"],
        matches: (data) => anyMessageContains(data.errorMessages, ["connection pool", "too many connections", "connection refused"]) ||
            anyAlertContains(data.alerts, ["connection pool", "database"]),
    },
    {
        id: "upstream-timeout",
        description: "Upstream service timeout propagating failures",
        baseLikelihood: 0.75,
        evidenceNeeded: ["upstream service health", "network latency", "circuit breaker state"],
        matches: (data) => anyMessageContains(data.errorMessages, ["timeout", "ETIMEDOUT", "deadline exceeded", "upstream"]) ||
            anyAlertContains(data.alerts, ["timeout", "latency"]),
    },
    {
        id: "disk-pressure",
        description: "Disk space exhaustion causing write failures",
        baseLikelihood: 0.8,
        evidenceNeeded: ["disk usage percentage", "inode usage", "write error logs"],
        matches: (data) => anyMessageContains(data.errorMessages, ["no space left", "disk full", "ENOSPC"]) ||
            data.metrics.some((m) => m.name.includes("disk") && m.value > m.threshold),
    },
    {
        id: "config-drift",
        description: "Configuration change caused unexpected behavior",
        baseLikelihood: 0.6,
        evidenceNeeded: ["recent config changes", "deployment history", "env variable diff"],
        matches: (data) => anyMessageContains(data.errorMessages, ["config", "environment", "invalid value", "parse error"]) ||
            anyAlertContains(data.alerts, ["config", "deployment"]),
    },
    {
        id: "certificate-expiry",
        description: "TLS certificate expired or invalid",
        baseLikelihood: 0.9,
        evidenceNeeded: ["certificate expiry date", "TLS handshake logs"],
        matches: (data) => anyMessageContains(data.errorMessages, ["certificate", "TLS", "SSL", "x509", "CERT_HAS_EXPIRED"]),
    },
    {
        id: "crash-loop",
        description: "Application crash loop due to startup failure",
        baseLikelihood: 0.85,
        evidenceNeeded: ["pod restart count", "container exit codes", "startup probe logs"],
        matches: (data) => anyMessageContains(data.errorMessages, ["CrashLoopBackOff", "crash loop", "restart"]) ||
            anyAlertContains(data.alerts, ["CrashLoopBackOff", "restart"]),
    },
];
const severityBoost = (severity) => {
    const boosts = {
        P1: 0.05,
        P2: 0.03,
        P3: 0.0,
        P4: -0.02,
        P5: -0.05,
    };
    return boosts[severity];
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const generateHypotheses = (data) => {
    const matched = PATTERN_RULES
        .filter((rule) => rule.matches(data))
        .map((rule) => ({
        id: rule.id,
        description: rule.description,
        likelihood: clamp(rule.baseLikelihood + severityBoost(data.severity), 0, 1),
        evidenceNeeded: rule.evidenceNeeded,
    }));
    return [...matched].sort((a, b) => b.likelihood - a.likelihood);
};
//# sourceMappingURL=hypothesis-generator.js.map