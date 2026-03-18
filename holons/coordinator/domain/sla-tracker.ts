import type { Severity } from "@argos/shared"

export interface IncidentTimestamp {
  readonly incidentId: string
  readonly severity: Severity
  readonly detectedAt: number
  readonly acknowledgedAt: number | null
  readonly resolvedAt: number | null
}

export interface SLAMetrics {
  readonly severity: Severity
  readonly mttaMs: number | null
  readonly mttrMs: number | null
  readonly incidentCount: number
  readonly acknowledgedCount: number
  readonly resolvedCount: number
}

const calculateMean = (values: readonly number[]): number | null => {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export const calculateSLAMetrics = (
  incidents: readonly IncidentTimestamp[],
  severity: Severity,
): SLAMetrics => {
  const filtered = incidents.filter((i) => i.severity === severity)

  const ttaValues: number[] = []
  const ttrValues: number[] = []
  let acknowledgedCount = 0
  let resolvedCount = 0

  for (const incident of filtered) {
    if (incident.acknowledgedAt !== null) {
      ttaValues.push(incident.acknowledgedAt - incident.detectedAt)
      acknowledgedCount++
    }

    if (incident.resolvedAt !== null) {
      ttrValues.push(incident.resolvedAt - incident.detectedAt)
      resolvedCount++
    }
  }

  return {
    severity,
    mttaMs: calculateMean(ttaValues),
    mttrMs: calculateMean(ttrValues),
    incidentCount: filtered.length,
    acknowledgedCount,
    resolvedCount,
  }
}

export const calculateAllSeverities = (
  incidents: readonly IncidentTimestamp[],
  severities: readonly Severity[],
): readonly SLAMetrics[] =>
  severities.map((severity) => calculateSLAMetrics(incidents, severity))
