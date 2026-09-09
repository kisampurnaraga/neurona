import React, { useState, useEffect } from 'react';
import { 
  Clapperboard, 
  Sparkles, 
  Zap, 
  Film, 
  Check, 
  Layers, 
  Info,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';
import { 
  HIGGSFIELD_CATALOG_MODELS, 
  OPENART_CATALOG_MODELS, 
  FAL_CATALOG_MODELS, 
  UnifiedModelInfo, 
  ModelProvider,
  getModelByProviderAndId,
  normalizeHiggsfieldModelId,
  normalizeOpenArtModelId
} from '../shared/modelCatalog';

export interface SelectedModelData {
  provider: ModelProvider;
  internalModelId: string;
  displayName: string;
  costCredits: number;
}

export interface UnifiedVideoModelSelectorProps {
  selectedProvider?: string;
  selectedModelId?: string;
  onChange?: (selection: SelectedModelData) => void;
  compact?: boolean;
  themeColor?: 'cyan' | 'purple' | 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose';
  idPrefix?: string;
  label?: string;
}

export const UnifiedVideoModelSelector: React.FC<UnifiedVideoModelSelectorProps> = ({
  selectedProvider: initialProviderProp,
  selectedModelId: initialModelProp,
  onChange,
  compact = true,
  themeColor = 'indigo',
  idPrefix = 'video-model',
  label = 'Model AI Video Engine'
}) => {
  // Determine initial state
  const [activeProvider, setActiveProvider] = useState<ModelProvider>(() => {
    if (initialProviderProp) {
      const p = initialProviderProp.toLowerCase();
      if (p.includes('higgsfield')) return 'higgsfield';
      if (p.includes('openart')) return 'openart';
      if (p.includes('fal')) return 'fal';
    }
    // Check local storage or default to higgsfield
    const savedProvider = localStorage.getItem('neurona_video_provider');
    if (savedProvider === 'higgsfield' || savedProvider === 'openart' || savedProvider === 'fal') {
      return savedProvider;
    }
    return 'higgsfield';
  });

  const [activeModelId, setActiveModelId] = useState<string>(() => {
    if (initialModelProp) {
      return initialModelProp;
    }
    const savedModel = localStorage.getItem('neurona_video_model');
    if (savedModel) return savedModel;
    return 'veo3_1_lite';
  });

  // Sync when props change
  useEffect(() => {
    if (initialProviderProp) {
      const p = initialProviderProp.toLowerCase();
      if (p.includes('higgsfield')) setActiveProvider('higgsfield');
      else if (p.includes('openart')) setActiveProvider('openart');
      else if (p.includes('fal')) setActiveProvider('fal');
    }
  }, [initialProviderProp]);

  useEffect(() => {
    if (initialModelProp) {
      setActiveModelId(initialModelProp);
    }
  }, [initialModelProp]);

  // Available models based on active provider
  const availableModels: UnifiedModelInfo[] = React.useMemo(() => {
    if (activeProvider === 'higgsfield') {
      return HIGGSFIELD_CATALOG_MODELS;
    } else if (activeProvider === 'openart') {
      return OPENART_CATALOG_MODELS;
    } else {
      return FAL_CATALOG_MODELS;
    }
  }, [activeProvider]);

  // Current selected model object
  const currentModel: UnifiedModelInfo = React.useMemo(() => {
    const found = availableModels.find(m => m.internalModelId === activeModelId);
    if (found) return found;
    return availableModels[0];
  }, [availableModels, activeModelId]);

  // Notify parent of selection
  const handleSelect = (provider: ModelProvider, modelId: string) => {
    setActiveProvider(provider);
    setActiveModelId(modelId);

    const modelsList = provider === 'higgsfield' 
      ? HIGGSFIELD_CATALOG_MODELS 
      : provider === 'openart' 
      ? OPENART_CATALOG_MODELS 
      : FAL_CATALOG_MODELS;
    
    const selected = modelsList.find(m => m.internalModelId === modelId) || modelsList[0];

    localStorage.setItem('neurona_video_provider', provider);
    localStorage.setItem('neurona_video_model', selected.internalModelId);
    localStorage.setItem('neurona_video_model_display', selected.displayName);

    if (onChange) {
      onChange({
        provider,
        internalModelId: selected.internalModelId,
        displayName: selected.displayName,
        costCredits: selected.costCredits
      });
    }
  };

  const handleProviderTabChange = (newProvider: ModelProvider) => {
    let defaultModelId = 'veo3_1_lite';
    if (newProvider === 'higgsfield') defaultModelId = 'veo3_1_lite';
    else if (newProvider === 'openart') defaultModelId = 'byte-plus-seedance-2-fast';
    else if (newProvider === 'fal') defaultModelId = 'fal-ai/veo3.1/lite/image-to-video';

    handleSelect(newProvider, defaultModelId);
  };

  // Color classes mapping
  const colorMap = {
    cyan: {
      activeBorder: 'border-cyan-500',
      activeBg: 'bg-cyan-500/15',
      text: 'text-cyan-400',
      badgeBg: 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300',
      tabActive: 'bg-cyan-500/20 text-cyan-300 border-cyan-500',
      radioRing: 'ring-cyan-500',
      glow: 'shadow-[0_0_15px_rgba(6,182,212,0.25)]'
    },
    purple: {
      activeBorder: 'border-purple-500',
      activeBg: 'bg-purple-500/15',
      text: 'text-purple-400',
      badgeBg: 'bg-purple-950/80 border-purple-500/30 text-purple-300',
      tabActive: 'bg-purple-500/20 text-purple-300 border-purple-500',
      radioRing: 'ring-purple-500',
      glow: 'shadow-[0_0_15px_rgba(168,85,247,0.25)]'
    },
    indigo: {
      activeBorder: 'border-indigo-500',
      activeBg: 'bg-indigo-500/15',
      text: 'text-indigo-400',
      badgeBg: 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300',
      tabActive: 'bg-indigo-500/20 text-indigo-300 border-indigo-500',
      radioRing: 'ring-indigo-500',
      glow: 'shadow-[0_0_15px_rgba(99,102,241,0.25)]'
    },
    emerald: {
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 border-emerald-500/30 text-emerald-300',
      tabActive: 'bg-emerald-500/20 text-emerald-300 border-emerald-500',
      radioRing: 'ring-emerald-500',
      glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]'
    },
    amber: {
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-500/15',
      text: 'text-amber-400',
      badgeBg: 'bg-amber-950/80 border-amber-500/30 text-amber-300',
      tabActive: 'bg-amber-500/20 text-amber-300 border-amber-500',
      radioRing: 'ring-amber-500',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.25)]'
    },
    blue: {
      activeBorder: 'border-blue-500',
      activeBg: 'bg-blue-500/15',
      text: 'text-blue-400',
      badgeBg: 'bg-blue-950/80 border-blue-500/30 text-blue-300',
      tabActive: 'bg-blue-500/20 text-blue-300 border-blue-500',
      radioRing: 'ring-blue-500',
      glow: 'shadow-[0_0_15px_rgba(59,130,246,0.25)]'
    },
    rose: {
      activeBorder: 'border-rose-500',
      activeBg: 'bg-rose-500/15',
      text: 'text-rose-400',
      badgeBg: 'bg-rose-950/80 border-rose-500/30 text-rose-300',
      tabActive: 'bg-rose-500/20 text-rose-300 border-rose-500',
      radioRing: 'ring-rose-500',
      glow: 'shadow-[0_0_15px_rgba(244,63,94,0.25)]'
    }
  };

  const theme = colorMap[themeColor] || colorMap.indigo;

  return (
    <div id={`${idPrefix}-container`} className="space-y-2.5">
      {/* Label and Info */}
      <div className="flex items-center justify-between">
        <label className={`text-[11px] uppercase font-bold tracking-wider flex items-center gap-1.5 ${theme.text}`}>
          <Clapperboard className="w-3.5 h-3.5" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Provider-Safe Routing</span>
        </span>
      </div>

      {/* Provider Selector Tabs */}
      <div className="grid grid-cols-3 gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
        <button
          type="button"
          id={`${idPrefix}-tab-higgsfield`}
          onClick={() => handleProviderTabChange('higgsfield')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeProvider === 'higgsfield'
              ? `${theme.tabActive} border shadow-sm`
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Higgsfield MCP</span>
        </button>

        <button
          type="button"
          id={`${idPrefix}-tab-openart`}
          onClick={() => handleProviderTabChange('openart')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeProvider === 'openart'
              ? `${theme.tabActive} border shadow-sm`
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Film className="w-3 h-3 text-purple-400" />
          <span>OpenArt MCP</span>
        </button>

        <button
          type="button"
          id={`${idPrefix}-tab-fal`}
          onClick={() => handleProviderTabChange('fal')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeProvider === 'fal'
              ? `${theme.tabActive} border shadow-sm`
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Layers className="w-3 h-3 text-cyan-400" />
          <span>Universal Fal</span>
        </button>
      </div>

      {/* Compact Dropdown & Details */}
      {compact ? (
        <div className="space-y-2">
          {/* Select dropdown */}
          <div className="relative">
            <select
              id={`${idPrefix}-select`}
              value={currentModel.internalModelId}
              onChange={(e) => handleSelect(activeProvider, e.target.value)}
              className="w-full bg-[#0A0E20] border border-white/10 hover:border-white/20 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white appearance-none cursor-pointer focus:outline-none transition pr-8"
            >
              {availableModels.map((m) => (
                <option key={m.internalModelId} value={m.internalModelId}>
                  {m.displayName} — {m.costCredits} CR ({m.tier.toUpperCase()})
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Model Card Details Preview */}
          <div className={`p-2.5 rounded-xl border bg-black/50 ${theme.activeBorder} ${theme.glow} flex items-start justify-between gap-3 text-xs`}>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white text-xs">{currentModel.displayName}</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${theme.badgeBg}`}>
                  {currentModel.provider.toUpperCase()}
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300">
                  {currentModel.costCredits} Credits
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                {currentModel.description}
              </p>
              <div className="text-[9px] font-mono text-slate-400 pt-0.5">
                Internal Routing ID: <span className="text-white">{currentModel.internalModelId}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Full Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
          {availableModels.map((model) => {
            const isSelected = currentModel.internalModelId === model.internalModelId;
            return (
              <button
                key={model.internalModelId}
                type="button"
                onClick={() => handleSelect(activeProvider, model.internalModelId)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? `bg-[#0E1530] border-2 ${theme.activeBorder} ${theme.glow}`
                    : 'bg-black/40 border-white/10 hover:border-white/20 hover:bg-black/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-white">{model.displayName}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-500/30 text-amber-300 shrink-0">
                      {model.costCredits} CR
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                    {model.description}
                  </p>
                </div>
                <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span>{model.internalModelId}</span>
                  {isSelected && (
                    <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                      <Check className="w-3 h-3" />
                      <span>Terpilih</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
