import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add state for LLM Engine
state_decl = """  const [llmEngine, setLlmEngine] = useState('gemini');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
"""
content = content.replace("const [userRunwayKey, setUserRunwayKey] = useState('');", "const [userRunwayKey, setUserRunwayKey] = useState('');\n" + state_decl)

# Add LLM selection UI
llm_ui = """
              {/* LLM Engine Router */}
              <div className="p-4 rounded-xl border border-violet-500/30 bg-violet-950/20">
                <h3 className="text-violet-300 font-bold text-sm flex items-center gap-1.5 mb-1"><Cpu size={16}/> AI Core Engine (Director)</h3>
                <p className="text-[10px] text-violet-200/70 mb-3 leading-relaxed">
                  Pilih "otak" AI yang akan bertugas sebagai Sutradara (pembuat naskah & prompt).
                </p>
                
                <select 
                  value={llmEngine}
                  onChange={(e) => setLlmEngine(e.target.value)}
                  className="w-full bg-black border border-violet-800 rounded-lg px-3 py-2 text-sm text-violet-300 focus:outline-none focus:border-violet-400 mb-3"
                >
                  <option value="gemini">Google Gemini (Terbaik untuk Analisis Foto/Vision)</option>
                  <option value="anthropic">Claude 3.5 Sonnet (Terbaik untuk Copywriting)</option>
                  <option value="openai">OpenAI GPT-4o (Standar Industri)</option>
                </select>

                {llmEngine === 'anthropic' && (
                  <input 
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-api03-xxxxxxxxxxxxxxxxx"
                    className="w-full bg-black border border-violet-800/50 rounded-lg px-3 py-2 text-sm text-violet-300/80 focus:outline-none focus:border-violet-400 placeholder-slate-600 mb-2"
                  />
                )}
                {llmEngine === 'openai' && (
                  <input 
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-xxxxxxxxxxxxxxxxx"
                    className="w-full bg-black border border-violet-800/50 rounded-lg px-3 py-2 text-sm text-violet-300/80 focus:outline-none focus:border-violet-400 placeholder-slate-600 mb-2"
                  />
                )}
              </div>
"""
content = content.replace("{/* Bring Your Own Key */}", llm_ui + "\n              {/* Bring Your Own Key */}")

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("LLM Selector UI updated.")
