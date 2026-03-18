// Infrastructure layer - Temporal client, notification integrations
export const NOTIFICATION_CHANNELS = ["slack", "pagerduty", "email", "webhook"] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]
