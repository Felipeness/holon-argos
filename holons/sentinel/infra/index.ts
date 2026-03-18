// Infrastructure layer - alert source adapters (PagerDuty, Prometheus, Datadog)
// Will implement actual API integrations
export const SUPPORTED_SOURCES = ["prometheus", "pagerduty", "datadog", "custom"] as const
export type AlertSource = (typeof SUPPORTED_SOURCES)[number]
