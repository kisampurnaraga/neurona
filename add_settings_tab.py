import sys

with open('src/components/FounderDashboard.tsx', 'r') as f:
    content = f.read()

import_statement = "import { AVAILABLE_VOICES, VoiceOption } from '../utils/speechSynthesis';\n"
if "AVAILABLE_VOICES" not in content:
    content = content.replace("import { motion, AnimatePresence } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';\n" + import_statement)

# add settings icon
if "Settings" not in content:
    content = content.replace("import { Shield, Users, UserPlus, FileText, CheckCircle2, Copy, Play, Search, LogOut } from 'lucide-react';", "import { Shield, Users, UserPlus, FileText, CheckCircle2, Copy, Play, Search, LogOut, Settings } from 'lucide-react';")

# modify state
content = content.replace("useState<'users' | 'activation_form' | 'stats' | 'payment' | 'inspector'>('users');", "useState<'users' | 'activation_form' | 'stats' | 'payment' | 'inspector' | 'settings'>('users');")

# add settings tab button
settings_btn = """
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-fuchsia-400 text-fuchsia-300 font-bold bg-fuchsia-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={15} />
            <span>Neurona Audio</span>
          </button>
"""

content = content.replace("          <button\n            onClick={() => setActiveTab('inspector')}", settings_btn + "          <button\n            onClick={() => setActiveTab('inspector')}")

# add settings tab content
settings_content = """
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 font-mono uppercase">Neurona Audio Voice Engine</h2>
              <p className="text-xs text-gray-400 mb-6 font-mono">Pilih model suara (TTS) yang digunakan untuk Asisten Neurona.</p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                {AVAILABLE_VOICES.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 p-3 bg-black/40 border border-white/5 rounded-lg cursor-pointer hover:bg-white/5 transition">
                    <input 
                      type="radio" 
                      name="neurona_voice" 
                      value={v.id}
                      checked={localStorage.getItem('neurona_ui_voice') === v.id || (!localStorage.getItem('neurona_ui_voice') && v.id === 'id-ID-Journey-O')}
                      onChange={() => {
                        localStorage.setItem('neurona_ui_voice', v.id);
                        // Trigger a custom event so other components know it changed
                        window.dispatchEvent(new Event('neurona_voice_changed'));
                        // Force re-render of this component
                        setActiveTab('settings'); 
                      }}
                      className="text-fuchsia-500 bg-black border-gray-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-semibold">{v.name}</span>
                        {v.gender === 'female' ? <span className="text-fuchsia-400 text-xs font-bold">♀</span> : <span className="text-cyan-400 text-xs font-bold">♂</span>}
                      </div>
                      <p className="text-xs text-gray-400">{v.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
"""

content = content.replace("        {activeTab === 'inspector' && (", settings_content + "        {activeTab === 'inspector' && (")

with open('src/components/FounderDashboard.tsx', 'w') as f:
    f.write(content)

