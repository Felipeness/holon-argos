import type { ServiceId } from "@orchestrix/shared"

export const ANOMALY_STATUS = {
  DETECTED: "DETECTED",
  NORMAL: "NORMAL",
} as const

export type AnomalyStatus = (typeof ANOMALY_STATUS)[keyof typeof ANOMALY_STATUS]

export const ANOMALY_SEVERITY = {
  CRITICAL: "CRITICAL",
  WARNING: "WARNING",
  INFO: "INFO",
} as const

export type AnomalySeverity = (typeof ANOMALY_SEVERITY)[keyof typeof ANOMALY_SEVERITY]

export const ANOMALY_TYPE = {
  STATIC_THRESHOLD: "STATIC_THRESHOLD",
  RATE_OF_CHANGE: "RATE_OF_CHANGE",
} as const

export type AnomalyType = (typeof ANOMALY_TYPE)[keyof typeof ANOMALY_TYPE]

export interface ThresholdConfig {
  readonly max: number
  readonly warning?: number
  readonly rateOfChangePercent?: number
}

export interface MetricSample {
  readonly serviceId: ServiceId
  readonly name: string
  readonly value: number
  readonly timestamp: number
}

export interface AnomalyResult {
  readonly status: AnomalyStatus
  readonly type: AnomalyType | null
  readonly severity: AnomalySeverity | null
  readonly details: string
  readonly metric: MetricSample
}

const classifySeverity = (value: number, config: ThresholdConfig): AnomalySeverity => {
  if (config.warning !== undefined && value <= config.warning) {
    return ANOMALY_SEVERITY.WARNING
  }
  return ANOMALY_SEVERITY.CRITICAL
}

const checkStaticThreshold = (sample: MetricSample, config: ThresholdConfig): AnomalyResult | null => {
  if (sample.value <= config.max) {
    return null
  }

  return {
    status: ANOMALY_STATUS.DETECTED,
    type: ANOMALY_TYPE.STATIC_THRESHOLD,
    severity: classifySeverity(sample.value, config),
    details: `metric "${sample.name}" value ${sample.value} exceeds max threshold ${config.max}`,
    metric: sample,
  }
}

const checkRateOfChange = (
  current: MetricSample,
  previous: MetricSample,
  config: ThresholdConfig,
): AnomalyResult | null => {
  if (config.rateOfChangePercent === undefined) {
    return null
  }

  if (previous.value === 0) {
    return current.value > 0
      ? {
          status: ANOMALY_STATUS.DETECTED,
          type: ANOMALY_TYPE.RATE_OF_CHANGE,
          severity: ANOMALY_SEVERITY.WARNING,
          details: `metric "${current.name}" spiked from 0 to ${current.value}`,
          metric: current,
        }
      : null
  }

  const changePercent = Math.abs((current.value - previous.value) / previous.value) * 100

  if (changePercent <= config.rateOfChangePercent) {
    return null
  }

  return {
    status: ANOMALY_STATUS.DETECTED,
    type: ANOMALY_TYPE.RATE_OF_CHANGE,
    severity: changePercent > config.rateOfChangePercent * 2 ? ANOMALY_SEVERITY.CRITICAL : ANOMALY_SEVERITY.WARNING,
    details: `metric "${current.name}" changed ${changePercent.toFixed(1)}% (threshold: ${config.rateOfChangePercent}%)`,
    metric: current,
  }
}

const normal = (sample: MetricSample): AnomalyResult => ({
  status: ANOMALY_STATUS.NORMAL,
  type: null,
  severity: null,
  details: `metric "${sample.name}" value ${sample.value} is within normal range`,
  metric: sample,
})

export const detectAnomaly = (
  sample: MetricSample,
  config: ThresholdConfig,
  previousSample?: MetricSample,
): AnomalyResult => {
  const thresholdResult = checkStaticThreshold(sample, config)
  if (thresholdResult) {
    return thresholdResult
  }

  if (previousSample) {
    const rateResult = checkRateOfChange(sample, previousSample, config)
    if (rateResult) {
      return rateResult
    }
  }

  return normal(sample)
}
