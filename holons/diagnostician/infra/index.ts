// Infrastructure layer - LLM integrations, log analysis, metric queries
export const DIAGNOSTIC_TOOLS = ["log_analysis", "metric_query", "trace_analysis", "llm_reasoning"] as const
export type DiagnosticTool = (typeof DIAGNOSTIC_TOOLS)[number]
