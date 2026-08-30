export type ProductionState = 'DRAFT' | 'BRIEFING' | 'STORYBOARDING' | 'AWAITING_APPROVAL' | 'PRODUCING' | 'ASSEMBLING' | 'AUDIO' | 'EDITING' | 'QA' | 'COMPLETED' | 'FAILED' | 'deleted';

export type ProviderStatus = 'NOT_CONFIGURED' | 'READY' | 'DEGRADED' | 'UNAVAILABLE' | 'AUTH_ERROR' | 'QUOTA_EXCEEDED' | 'TIMEOUT' | 'ERROR';

export type VideoType = 'AFFILIATE' | 'ANIMATION' | 'EDUCATIONAL' | 'BRAND_COMMERCIAL' | 'CINEMATIC';

export interface ProviderError {
  code: ProviderStatus;
  provider: string;
  stage: string;
  retryable: boolean;
  message: string;
  metadata?: any;
  qaScore?: number;
  qaPassed?: boolean;
  qaIssues?: string[];
}

export interface CharacterProfile {
  name: string;
  gender: 'MALE' | 'FEMALE' | 'NEUTRAL';
  ageGroup: string;
  outfit: string;
  facialFeatures: string;
  hairStyle: string;
  styleSeed: number;
  colorPalette: string[];
  consistencyAnchorPrompt: string;
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
}

export interface Scene {
  featuresProduct?: boolean;
  backgroundLock?: 'locked' | 'free';
  location?: string;
  faceLock?: boolean;
  productLock?: boolean;
  videoProgress?: string;
  id: string;
  duration: string;
  visualDirection: string;
  dialogue?: string;
  voiceOver?: string;
  textOverlay?: string;
  subtitle?: string;
  promptImageToVideo?: string; // AI Video generation prompt (Wan / Seedance / Kling / Minimax / Hunyuan / BytePlus)
  promptTextToImage?: string; // AI Consistent Keyframe image prompt
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  imageStatus?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  videoStatus?: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  imageUrl?: string;
  videoUrl?: string;
  assetUrl?: string;
  styleKeywords?: string[];
  imageCreditCost?: number; // e.g. 5 credits
  videoCreditCost?: number; // e.g. 15 credits
  metadata?: any;
  qaScore?: number;
  qaPassed?: boolean;
  qaIssues?: string[];
  qaBreakdown?: {
    productLockConsistency: number;
    visualPromptAdherence: number;
    narrativeFlow: number;
  };
  qaRecommendations?: string[];
  correctedVisualPrompt?: string;
  correctedVideoPrompt?: string;
  correctedScript?: string;
}

export interface Storyboard {
  scenes: Scene[];
  characterProfile?: CharacterProfile;
  creditsRequired?: number;
  totalImageCredits?: number;
  totalVideoCredits?: number;
  totalDurationSeconds?: number;
  isStoryboardCompleted?: boolean;
}

export interface ProductAsset {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  name: string;
  size?: number;
  previewUrl?: string;
}

export interface AffiliateConfig {
  aspectRatio?: '16:9' | '9:16' | '1:1';
  productName: string;
  category?: string;
  platform: 'TikTok Shop' | 'Shopee Video' | 'Instagram Reels' | 'YouTube Shorts';
  keyBenefits?: string;
  pricePromo?: string;
  callToAction?: string;
  hookStyle?: 'PAIN_POINT' | 'CURIOSITY' | 'UNBOXING' | 'BEFORE_AFTER' | 'AESTHETIC_REVEAL';
  characterImage?: string;
  productInfo?: string;
  productImages: string[];
  referenceVideoUrl?: string;
  productVisualAnalysis?: string;
  characterVisualAnalysis?: string;
  sceneCount?: number;
  imageEngine?: string;
  videoEngine?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'founder' | 'user' | 'vip';
  phone?: string;
  credits?: number;
}

export interface AnimationConfig {
  title: string;
  artStyle: '3D_PIXAR' | '3D_UNREAL_HYPER' | 'ANIME_SHINKAI' | 'ANIME_CYBERPUNK' | '2D_CLASSIC_CARTOON' | 'CLAYMATION' | 'COMIC_BOOK' | 'PIXEL_ART';
  language: string; // e.g. 'id', 'en', 'ja', 'ko', 'es'
  targetGenre: 'ADVENTURE' | 'COMEDY' | 'SCI_FI' | 'FANTASY' | 'EMOTIONAL_DRAMA' | 'ACTION';
  characterDescription?: string;
  worldSetting?: string;
  voiceTone: 'CHEERFUL' | 'EPIC_HEROIC' | 'DEEP_DRAMATIC' | 'CUTE_ANIME' | 'CALM_NARRATOR';
  aspectRatio: '16:9' | '9:16' | '1:1';
  sceneCount?: number;
  imageEngine?: string;
  characterVisualAnalysis?: string;
  characterReferenceUrl?: string;
  characterReferenceUrls?: string[];
}

export interface EducationalConfig {
  subjectTitle: string;
  category: string;
  targetAudience: 'KIDS' | 'STUDENTS' | 'PROFESSIONALS' | 'GENERAL_ELI5';
  visualStyle: 'MOTION_GRAPHICS_2D' | 'WHITEBOARD_ANIMATION' | 'ISOMETRIC_3D' | 'SCIENCE_BLUEPRINT' | 'DOCUMENTARY_INFOGRAPHIC';
  language: string; // 'id', 'en', 'id-en-bilingual', 'es', 'ar'
  keyTakeaways: string;
  chapterCount: number;
  narratorTone: 'ENERGETIC_TEACHER' | 'CALM_PROFESSOR' | 'FRIENDLY_EXPLAINER' | 'DOCUMENTARY_NARRATOR';
  aspectRatio: '16:9' | '9:16' | '1:1';
  characterDescription?: string;
  worldSetting?: string;
  sceneCount?: number;
}

export interface AgentTelemetry {
  id: string;
  codename: string;
  agentName: string;
  role: string;
  status: 'ONLINE' | 'ACTIVE' | 'STANDBY' | 'FAILED';
  location: string;
  currentTask: string;
  progress: number;
  latencyMs: number;
  lastOutput?: string;
}

export interface TerminalLog {
  id: string;
  timestamp: string;
  source: string;
  message: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' | 'INTERRUPT';
}

export interface TTSVoiceConfig {
  provider: 'elevenlabs' | 'tryaudio' | 'webspeech' | 'edge';
  voiceGender: 'male' | 'female';
  voiceId?: string;
  voiceName?: string;
  speed?: number;
  pitch?: number;
  emotion?: 'neutral' | 'enthusiastic' | 'deep_cinematic' | 'friendly' | 'dramatic' | 'calm';
}

export interface ProductionProject {
  id: string;
  userId?: string;
  masterCharacterImageUrl?: string;
  masterProductImageUrl?: string;
  title: string;
  status: ProductionState;
  videoType: VideoType;
  videoModel?: 'kling' | 'seedance' | 'wan' | 'hunyuan' | 'minimax' | string;
  ttsVoiceConfig?: TTSVoiceConfig;
  overallProgress?: number; // 0 to 100%
  currentPhaseName?: string; // e.g. 'Perumusan Konsep (BATARA)', 'Perancangan Storyboard (SINTA)'
  affiliateConfig?: AffiliateConfig;
  animationConfig?: AnimationConfig;
  educationalConfig?: EducationalConfig;
  attachedAssets?: ProductAsset[];
  brief?: any;
  characterProfile?: CharacterProfile;
  storyboard?: Storyboard;
  marketingCopy?: {
    caption?: string;
    hashtags?: string[];
    tiktok_caption?: string;
    instagram_caption?: string;
    youtube_caption?: string;
    hashtags_tiktok?: string[];
    hashtags_instagram?: string[];
    hashtags_youtube?: string[];
    voiceProfile?: string;
  };
  userChoice?: 'STORYBOARD_ONLY' | 'GENERATE_IMAGES' | 'FULL_PRODUCTION';
  activeProductionStage?: 'STORYBOARD' | 'IMAGES' | 'VIDEOS' | 'COMPLETED';
  finalVideoUrl?: string;
  subtitleStyle?: string;
  brandLogoUrl?: string;
  extraVideoUrl?: string;

  error?: string;
  providerError?: ProviderError;
  activeAgent?: string;
  agentStatus: Record<string, 'WAITING' | 'WORKING' | 'COMPLETE' | 'FAILED'>;
  telemetry?: AgentTelemetry[];
  showcaseEligible?: boolean;
  deletedAt?: string;

  logs?: TerminalLog[];
  audioResponseUrl?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}
