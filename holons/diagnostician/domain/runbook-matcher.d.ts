export declare const RUNBOOK_CATEGORY: {
    readonly MEMORY: "MEMORY";
    readonly CPU: "CPU";
    readonly DATABASE: "DATABASE";
    readonly NETWORK: "NETWORK";
    readonly DISK: "DISK";
    readonly CONFIGURATION: "CONFIGURATION";
    readonly CERTIFICATE: "CERTIFICATE";
    readonly DEPLOYMENT: "DEPLOYMENT";
};
export type RunbookCategory = (typeof RUNBOOK_CATEGORY)[keyof typeof RUNBOOK_CATEGORY];
export interface RunbookEntry {
    readonly id: string;
    readonly title: string;
    readonly category: RunbookCategory;
    readonly keywords: readonly string[];
    readonly steps: readonly string[];
}
export interface RunbookMatch {
    readonly runbook: RunbookEntry;
    readonly confidence: number;
    readonly matchedKeywords: readonly string[];
}
export declare const matchRunbooks: (rootCause: string) => readonly RunbookMatch[];
//# sourceMappingURL=runbook-matcher.d.ts.map