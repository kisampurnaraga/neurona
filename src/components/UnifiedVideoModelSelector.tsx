import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Clapperboard, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  ChevronDown,
  Cpu,
  Layers,
  Settings2
} from 'lucide-react';
import { 
  CatalogModelEntry, 
  buildDefaultCatalogEntries, 
  filterModelsByCapability,
  ModelProvider
} from '../shared/modelCatalog';

export interface SelectedModelData {
  provider: ModelProvider | 'auto';
  internalModelId: string;
  displayName: string;
  costCredits: number;
  execution?: string;
}

export interface UnifiedVideoModelSelectorProps {
  selectedProvider?: string;
  selectedModelId?: string;
  selectedExecution?: string;
  capability?: 'VIDEO' | 'IMAGE' | 'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO' | 'TEXT_TO_IMAGE';
  studioType?: string;
  onChange?: (selection: SelectedModelData) => void;
  compact?: boolean;
  themeColor?: 'cyan' | 'purple' | 'indigo' | 'emerald' | 'amber' | 'blue' | 'rose';
  idPrefix?: string;
  label?: string;
}

export const UnifiedVideoModelSelector: React.FC<UnifiedVideoModelSelectorProps> = ({
  selectedProvider: initialProviderProp,
  selectedModelId: initialModelProp,
  selectedExecution: initialExecutionProp = 'auto',
  capability = 'VIDEO',
  onChange,
  themeColor = 'indigo',
  idPrefix = 'video-model-selector',
  label = 'AI Media Engine & Provider'
}) => {
  // 1. Core Selector State
  const [provider, setProvider] = useState<'auto' | 'higgsfield' | 'openart'>(() => {
    if (initialProviderProp) {
      const p = initialProviderProp.toLowerCase();
      if (p.includes('higgsfield')) return 'higgsfield';
      if (p.includes('openart')) return 'openart';
      if (p === 'auto') return 'auto';
    }
    return 'auto';
  });

  const [modelId, setModelId] = useState<string>(() => {
    if (initialModelProp) return initialModelProp;
    return 'auto';
  });

  const [execution, setExecution] = useState<string>(() => {
    return initialExecutionProp || 'auto';
  });

  // 2. Catalog & Dynamic Models State
  const [catalog, setCatalog] = useState<CatalogModelEntry[]>(() => buildDefaultCatalogEntries());
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);

  // Sync with prop changes if parent updates
  useEffect(() => {
    if (initialProviderProp !== undefined) {
      const p = initialProviderProp.toLowerCase();
      if (p.includes('higgsfield')) setProvider('higgsfield');
      else if (p.includes('openart')) setProvider('openart');
      else setProvider('auto');
    }
  }, [initialProviderProp]);

  useEffect(() => {
    if (initialModelProp !== undefined) {
      setModelId(initialModelProp);
    }
  }, [initialModelProp]);

  // Fetch dynamic model catalog from backend FounderService/DB
  const fetchCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    try {
      const op = capability || 'VIDEO';
      const res = await fetch(`/api/models/catalog?operation=${op}`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.models) && data.models.length > 0) {
          setCatalog(data.models);
        }
      }
    } catch (err) {
      console.warn('[UnifiedVideoModelSelector] Using local catalog fallback:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, [capability]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Filter available models strictly by studio capability and active provider
  const availableModels = useMemo(() => {
    return filterModelsByCapability(catalog, {
      provider: provider === 'auto' ? undefined : provider,
      operation: capability,
      onlyEnabled: true
    });
  }, [catalog, provider, capability]);

  // Resolve current active model info
  const resolvedModelInfo = useMemo(() => {
    if (modelId === 'auto') {
      // Pick first recommended model for the provider
      const defaultModel = availableModels[0] || catalog[0];
      return {
        internalModelId: 'auto',
        displayName: 'Auto — Recommended',
        costCredits: defaultModel?.sellingPrice || 8,
        tier: defaultModel?.tier || 'balanced',
        provider: provider,
        description: 'Router will automatically select the best model based on prompt complexity and latency targets.'
      };
    }

    const found = availableModels.find(m => m.internalModelId === modelId) ||
                  catalog.find(m => m.internalModelId === modelId);

    if (found) {
      return {
        internalModelId: found.internalModelId,
        displayName: found.displayName,
        costCredits: found.sellingPrice,
        tier: found.tier,
        provider: found.provider,
        description: found.description
      };
    }

    return {
      internalModelId: modelId,
      displayName: modelId,
      costCredits: 8,
      tier: 'balanced',
      provider: provider,
      description: 'Custom model selection'
    };
  }, [modelId, availableModels, catalog, provider]);

  // Emit change when selection changes
  const notifyChange = (newProv: 'auto' | 'higgsfield' | 'openart', newModId: string, newExec: string) => {
    if (!onChange) return;

    let display = 'Auto — Recommended';
    let credits = 8;

    if (newModId !== 'auto') {
      const match = catalog.find(m => m.internalModelId === newModId);
      if (match) {
        display = match.displayName;
        credits = match.sellingPrice;
      }
    }

    onChange({
      provider: newProv,
      internalModelId: newModId,
      displayName: display,
      costCredits: credits,
      execution: newExec
    });
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'auto' | 'higgsfield' | 'openart';
    setProvider(val);
    // Reset to auto model when provider switches to keep selections valid
    setModelId('auto');
    notifyChange(val, 'auto', execution);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setModelId(val);
    notifyChange(provider, val, execution);
  };

  const handleExecutionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setExecution(val);
    notifyChange(provider, modelId, val);
  };

  // Theme color accents
  const themeClasses = {
    indigo: 'text-indigo-400 border-indigo-500/30 focus:border-indigo-500',
    cyan: 'text-cyan-400 border-cyan-500/30 focus:border-cyan-500',
    purple: 'text-purple-400 border-purple-500/30 focus:border-purple-500',
    emerald: 'text-emerald-400 border-emerald-500/30 focus:border-emerald-500',
    amber: 'text-amber-400 border-amber-500/30 focus:border-amber-500',
    blue: 'text-blue-400 border-blue-500/30 focus:border-blue-500',
    rose: 'text-rose-400 border-rose-500/30 focus:border-rose-500'
  }[themeColor] || 'text-indigo-400 border-indigo-500/30 focus:border-indigo-500';

  return (
    <div id={`${idPrefix}-root`} className="space-y-3 font-sans">
      {/* Header & Verification Badge */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
          <Clapperboard className="w-3.5 h-3.5 text-indigo-400" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>Unified Architecture</span>
        </span>
      </div>

      {/* 3-Column Standard Dropdown Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* 1. PROVIDER SELECTOR */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-provider`} className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Cpu className="w-3 h-3 text-slate-400" />
            <span>Provider</span>
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-provider`}
              value={provider}
              onChange={handleProviderChange}
              className="w-full bg-[#080d1e] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white appearance-none cursor-pointer focus:outline-none transition pr-8 font-medium shadow-sm"
            >
              <option value="auto">Auto (Smart Routing)</option>
              <option value="higgsfield">Higgsfield</option>
              <option value="openart">OpenArt</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 2. MODEL SELECTOR */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-model`} className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-slate-400" />
            <span>Model</span>
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-model`}
              value={modelId}
              onChange={handleModelChange}
              className="w-full bg-[#080d1e] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white appearance-none cursor-pointer focus:outline-none transition pr-8 font-medium shadow-sm"
            >
              <option value="auto">Auto — Recommended</option>
              {availableModels.map((m) => (
                <option key={m.modelKey} value={m.internalModelId}>
                  {m.displayName} ({m.sellingPrice} CR)
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* 3. EXECUTION SELECTOR */}
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-execution`} className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
            <Settings2 className="w-3 h-3 text-slate-400" />
            <span>Execution</span>
          </label>
          <div className="relative">
            <select
              id={`${idPrefix}-execution`}
              value={execution}
              onChange={handleExecutionChange}
              className="w-full bg-[#080d1e] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white appearance-none cursor-pointer focus:outline-none transition pr-8 font-medium shadow-sm"
            >
              <option value="auto">Automatic</option>
              <option value="fast">Fast Execution</option>
              <option value="director">Director Precision</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Model & Routing Details Meta Bar */}
      <div className="p-2.5 rounded-xl border border-slate-800 bg-[#060a17]/90 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white text-xs">{resolvedModelInfo.displayName}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 uppercase">
            {provider === 'auto' ? 'Auto Router' : provider.toUpperCase()}
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-500/30 text-amber-300 font-bold">
            {resolvedModelInfo.costCredits} Credits
          </span>
        </div>
        <div className="text-[11px] text-slate-400 text-right truncate max-w-[200px] sm:max-w-xs">
          {provider === 'higgsfield' && 'API / MCP internal dispatch'}
          {provider === 'openart' && 'Seedance & Kling rendering'}
          {provider === 'auto' && 'Orchestrator managed'}
        </div>
      </div>
    </div>
  );
};
