import sys

with open('src/components/FounderDashboard.tsx', 'r') as f:
    content = f.read()

# Add GEMINI API KEY field in the settings tab
api_key_field = """
            <div className="bg-[#111] border border-white/10 rounded-xl p-6 mt-6">
              <h2 className="text-lg font-bold text-white mb-2 font-mono uppercase">API Keys & Quota Management</h2>
              <p className="text-xs text-gray-400 mb-6 font-mono">Gunakan Gemini API Key berbayar Anda untuk menghindari limit/quota exceeded saat chat & TTS.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-2">Gemini API Key (Manual Override)</label>
                  <div className="flex gap-2">
                    <input 
                      type="password"
                      id="gemini_key_input"
                      placeholder="AIzaSy..."
                      defaultValue={localStorage.getItem('neurona_gemini_api_key') || ''}
                      className="flex-1 bg-black border border-white/10 rounded-lg p-3 text-white text-xs outline-none focus:border-amber-500 font-mono"
                    />
                    <button 
                      onClick={() => {
                        const val = (document.getElementById('gemini_key_input') as HTMLInputElement).value;
                        if (val) {
                          localStorage.setItem('neurona_gemini_api_key', val);
                          // Send to backend to update process.env temporarily if needed, or simply let frontend pass it in headers
                          fetch('/api/founder/update-key', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ key: val })
                          });
                          showToast('Gemini API Key berhasil disimpan!');
                        } else {
                          localStorage.removeItem('neurona_gemini_api_key');
                          showToast('Gemini API Key dihapus (kembali ke default).');
                        }
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold text-xs font-mono transition"
                    >
                      Simpan Key
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-2">Key ini akan disimpan secara lokal dan disuntikkan ke setiap request Neurona Chat & TTS.</p>
                </div>
              </div>
            </div>
"""

content = content.replace("              <div className=\"space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2\">", api_key_field + "\n              <div className=\"space-y-3 max-h-96 overflow-y-auto custom-scrollbar pr-2\">")

with open('src/components/FounderDashboard.tsx', 'w') as f:
    f.write(content)

with open('server.ts', 'r') as f:
    server_content = f.read()

update_key_endpoint = """
  app.post('/api/founder/update-key', (req, res) => {
    const { key } = req.body;
    if (key) {
      process.env.GEMINI_MANUAL_API_KEY = key;
    } else {
      delete process.env.GEMINI_MANUAL_API_KEY;
    }
    res.json({ success: true });
  });

  app.post('/api/neurona-chat',
"""
server_content = server_content.replace("app.post('/api/neurona-chat',", update_key_endpoint)

with open('server.ts', 'w') as f:
    f.write(server_content)
    
print("Settings patched")
