import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_statement = "import { Wallet, Key, Coins } from 'lucide-react';\n"
if "Coins }" not in content:
    content = content.replace("import { GalleryModal } from './components/GalleryModal';", "import { GalleryModal } from './components/GalleryModal';\n" + import_statement)

# Add state for user settings
state_decl = """  const [showUserSettings, setShowUserSettings] = useState(false);
  const [userCoins, setUserCoins] = useState(150);
  const [userRunwayKey, setUserRunwayKey] = useState('');
"""
content = content.replace("const [showGallery, setShowGallery] = useState(false);", "const [showGallery, setShowGallery] = useState(false);\n" + state_decl)

# Add wallet and settings button to top nav
nav_buttons = """
          <button 
            onClick={() => setShowUserSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900 text-amber-300 transition cursor-pointer text-xs font-mono"
            title="Sistem Kredit & API Key"
          >
            <Coins size={14} className="text-amber-400" />
            <span className="font-bold">{userCoins} Koin</span>
          </button>
"""
content = content.replace("onClick={() => setShowFcc(true)}", "onClick={() => setShowFcc(true)}")
fcc_btn_find = """<button 
            onClick={() => setShowFcc(true)}"""
content = content.replace(fcc_btn_find, nav_buttons + "          " + fcc_btn_find)

# Add Settings Modal component inline
settings_modal = """
      {showUserSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowUserSettings(false)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center gap-2 text-amber-400">
                <Wallet size={20} />
                <h2 className="font-bold uppercase tracking-wider text-sm">Pengaturan & Penagihan</h2>
              </div>
              <button onClick={() => setShowUserSettings(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              
              {/* Pay-as-you-go Coins */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-amber-300 font-bold text-sm flex items-center gap-1.5"><Coins size={16}/> Saldo NEURONA Koin</h3>
                  <span className="text-2xl font-black text-amber-400">{userCoins}</span>
                </div>
                <p className="text-xs text-amber-200/70 mb-4">Digunakan untuk render video AI otomatis. (1 Adegan = 100 Koin).</p>
                <button className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white rounded-lg text-sm font-bold shadow-lg shadow-amber-600/20 transition">
                  Top Up Koin (+500 Koin)
                </button>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">ATAU</span>
              </div>

              {/* Bring Your Own Key */}
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20">
                <h3 className="text-cyan-300 font-bold text-sm flex items-center gap-1.5 mb-1"><Key size={16}/> Bring Your Own Key (BYOK)</h3>
                <p className="text-[10px] text-cyan-200/70 mb-3 leading-relaxed">
                  Gunakan API Key Runway Gen-3 Alpha Anda sendiri. Saldo koin tidak akan dipotong saat Anda merender video.
                </p>
                <input 
                  type="password"
                  value={userRunwayKey}
                  onChange={(e) => setUserRunwayKey(e.target.value)}
                  placeholder="key_xxxxxxxxxxxxxxxxx"
                  className="w-full bg-black border border-cyan-800 rounded-lg px-3 py-2 text-sm text-cyan-300 focus:outline-none focus:border-cyan-400 placeholder-slate-600 mb-3"
                />
                <button 
                  onClick={() => { alert('API Key disimpan secara lokal di browser Anda!'); setShowUserSettings(false); }}
                  className="w-full py-2 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-600 text-cyan-300 rounded-lg text-sm font-bold transition"
                >
                  Simpan API Key
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
"""
content = content.replace("{showGallery && (", settings_modal + "\n      {showGallery && (")

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Monetization UI updated.")

