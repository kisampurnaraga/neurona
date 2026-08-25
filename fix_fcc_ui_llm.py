import sys

with open('src/FounderControlCenter.tsx', 'r') as f:
    content = f.read()

# Update FCCConfig interface
content = content.replace("imageEngine?: 'chatgpt-image-2' | 'dall-e-3' | 'imagen-3' | 'flux-diffusion';", "imageEngine?: 'chatgpt-image-2' | 'dall-e-3' | 'imagen-3' | 'flux-diffusion';\n  llmEngine?: 'gemini' | 'anthropic' | 'openai';")

# Add handleSetLlmEngine
handle_set_llm = """
  const handleSetLlmEngine = async (engine: 'gemini' | 'anthropic' | 'openai') => {
    try {
      const res = await fetch('/api/fcc/llm-engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-role': 'founder' },
        body: JSON.stringify({ engine })
      });
      if (res.ok) {
        fetchConfig();
      }
    } catch (e) {
      console.error('Failed to set LLM engine', e);
    }
  };
"""
content = content.replace("const handleSetImageEngine = async", handle_set_llm + "\n  const handleSetImageEngine = async")

# Add the UI for LLM Engine selection
llm_ui = """
              {/* Default LLM Engine Selector Card */}
              <div className="p-5 bg-[#080808] border border-cyan-900/40 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Cpu size={16} className="text-cyan-400" />
                      <h3 className="text-xs font-bold text-white uppercase tracking-widest">Master LLM Engine (Core Agents)</h3>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 font-bold uppercase font-mono">
                        Active: {config.llmEngine || 'gemini'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Pilih "otak" utama (Director) pembuat instruksi, analisis produk, dan copywriting naskah video Anda.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'gemini', label: 'Google Gemini 1.5 Pro', badge: 'Terbaik Vision', desc: 'Superior untuk analisa gambar/produk' },
                    { id: 'anthropic', label: 'Claude 3.5 Sonnet', badge: 'Terbaik Naskah', desc: 'Sempurna untuk copywriting & konsistensi' },
                    { id: 'openai', label: 'OpenAI GPT-4o', badge: 'Standar Industri', desc: 'Handal dan stabil' }
                  ].map(eng => {
                    const isSelected = (config.llmEngine || 'gemini') === eng.id;
                    return (
                      <button
                        key={eng.id}
                        onClick={() => handleSetLlmEngine(eng.id as any)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                          isSelected 
                            ? 'bg-cyan-950/50 border-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.25)] text-white' 
                            : 'bg-[#0f0f0f] border-[#222] hover:border-gray-600 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold">{eng.label}</span>
                            {isSelected && <CheckCircle2 size={14} className="text-cyan-400" />}
                          </div>
                          <div className="text-[10px] opacity-75 mt-0.5">{eng.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
"""

# Inject before the Image Engine Card
content = content.replace("{/* Default Image Engine Selector Card */}", llm_ui + "\n              {/* Default Image Engine Selector Card */}")

with open('src/FounderControlCenter.tsx', 'w') as f:
    f.write(content)
print("FCC UI updated with LLM Engine selector.")
