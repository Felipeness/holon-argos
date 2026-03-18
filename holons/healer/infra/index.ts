// Infrastructure layer - Kubernetes, cloud provider, deployment tool adapters
export const REMEDIATION_ACTIONS = [
  "restart_pod",
  "scale_up",
  "scale_down",
  "rollback_deploy",
  "toggle_feature_flag",
  "flush_cache",
  "restart_service",
  "failover_region",
] as const

export type RemediationAction = (typeof REMEDIATION_ACTIONS)[number]

export { applyFixWithClaude, FixError } from './claude-fixer.js'
export type { FixRequest, FixResult } from './claude-fixer.js'
