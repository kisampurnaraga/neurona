export enum ProductionState {
  DRAFT = 'DRAFT',
  BRIEFING = 'BRIEFING',
  PLANNING = 'PLANNING',
  STORYBOARDING = 'STORYBOARDING',
  QUOTA_FALLBACK_PENDING = 'QUOTA_FALLBACK_PENDING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  PRODUCING = 'PRODUCING',
  ASSEMBLING = 'ASSEMBLING',
  AUDIO = 'AUDIO',
  EDITING = 'EDITING',
  QA = 'QA',
  REVISION = 'REVISION',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED'
}

export enum AgentType {
  CREATIVE_STRATEGIST = 'CREATIVE_STRATEGIST',
  STORYBOARD_DIRECTOR = 'STORYBOARD_DIRECTOR',
  VIDEO_DIRECTOR = 'VIDEO_DIRECTOR',
  VIDEO_ASSEMBLY_EDITOR = 'VIDEO_ASSEMBLY_EDITOR',
  AUDIO_DESIGNER = 'AUDIO_DESIGNER',
  VIRAL_CONTENT_EDITOR = 'VIRAL_CONTENT_EDITOR',
  VIDEO_QA_DIRECTOR = 'VIDEO_QA_DIRECTOR',
  DISTRIBUTION_MANAGER = 'DISTRIBUTION_MANAGER'
}

export interface AgentRun {
  id: string;
  projectId: string;
  agent: AgentType;
  stage: ProductionState;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

export interface Scene {
  videoProgress?: string;
  id: string;
  duration: number;
  objective: string;
  visualDescription: string;
  subject: string;
  environment: string;
  action: string;
  camera: string;
  lighting: string;
  dialogue?: string;
  voiceOver?: string;
  textOverlay?: string;
  soundEffects?: string;
  musicDirection?: string;
  transition?: string;
  generationPrompt: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  assetUrl?: string;
  videoUrl?: string;
}

export interface Storyboard {
  id: string;
  version: number;
  scenes: Scene[];
  approved: boolean;
  approvedAt?: Date;
}

export interface ProductionBrief {
  objective: string;
  targetAudience: string;
  product: string;
  platform: string;
  language: string;
  tone: string;
  creativeAngle: string;
  duration: number;
  aspectRatio: string;
}

export interface ProductionProject {
  id: string;
  userId: string;
  organizationId: string;
  type: 'VIDEO' | 'IMAGE' | 'EBOOK' | 'STORY' | 'CUSTOM';
  title: string;
  status: ProductionState;
  brief?: ProductionBrief;
  storyboard?: Storyboard;
  finalVideoUrl?: string;
  brandLogoUrl?: string;
  extraVideoUrl?: string;
  assets: any[];
  agentRuns: AgentRun[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductionEvent {
  type: string;
  projectId: string;
  payload?: any;
  timestamp: Date;
}
