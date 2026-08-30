const fs = require('fs');
let content = fs.readFileSync('src/shared/types.ts', 'utf8');

// Update ProductionState
content = content.replace(
  "export type ProductionState = 'DRAFT' | 'BRIEFING' | 'STORYBOARDING' | 'AWAITING_APPROVAL' | 'PRODUCING' | 'ASSEMBLING' | 'AUDIO' | 'EDITING' | 'QA' | 'COMPLETED' | 'FAILED';",
  "export type ProductionState = 'DRAFT' | 'BRIEFING' | 'STORYBOARDING' | 'AWAITING_APPROVAL' | 'PRODUCING' | 'ASSEMBLING' | 'AUDIO' | 'EDITING' | 'QA' | 'COMPLETED' | 'FAILED' | 'deleted';"
);

// Add missing properties to ProductionProject
const newProps = `
  error?: string;
  providerError?: ProviderError;
  activeAgent?: string;
  agentStatus: Record<string, 'WAITING' | 'WORKING' | 'COMPLETE' | 'FAILED'>;
  telemetry?: AgentTelemetry[];
  createdAt: string;
  updatedAt: string;
  showcaseEligible?: boolean;
  deletedAt?: string;
`;
content = content.replace(/  error\?: string;\n  providerError\?: ProviderError;\n  activeAgent\?: string;\n  agentStatus: Record<string, 'WAITING' \| 'WORKING' \| 'COMPLETE' \| 'FAILED'>;\n  telemetry\?: AgentTelemetry\[\];(\n  createdAt: string;\n  updatedAt: string;)?/, newProps);

fs.writeFileSync('src/shared/types.ts', content);
