export { SentinelService } from "../domain/index.js"
export type { Alert, AlertCorrelation, SentinelDomain } from "../domain/index.js"

export { WEBHOOK_SOURCE, WEBHOOK_STATUS } from "./webhook-intake.js"
export type {
  WebhookSource,
  WebhookStatus,
  WebhookAlertPayload,
  PrometheusWebhookPayload,
  PrometheusAlert,
  WebhookIntakeResult,
  WebhookIntakeRoute,
  WebhookIntakeRoutes,
} from "./webhook-intake.js"
