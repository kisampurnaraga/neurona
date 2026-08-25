const fs = require('fs');

let path = 'src/components/LandingPage.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace Recommended Notice
content = content.replace(
  /{[\s\n]*\/\* Recommended Notice \*\/[\s\n]*<div className="mt-4 p-3 rounded-xl bg-sky-500\/10 border border-sky-500\/30 flex items-start gap-2\.5 text-xs text-sky-200">[\s\S]*?<\/div>[\s\n]*}/, 
  '' // Actually it's outside braces
);
// wait let's just use string replacement
let searchNotice = `{/* Recommended Notice */}
              <div className="mt-4 p-3 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-start gap-2.5 text-xs text-sky-200">
                <Sparkles size={16} className="text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sky-300">💡 Rekomendasi Proses Cepat:</span> Gunakan <strong>Telegram Bot Neuronna</strong> untuk konfirmasi instan & otomatis tanpa menunggu antrean manual!
                </div>
              </div>`;
content = content.replace(searchNotice, `{/* Telegram feature disabled per user request */}`);

let searchBtn = `{/* Telegram Bot Button (Recommended) */}
                <a
                  href={\`https://t.me/\${paymentConfig.telegramBotUsername || 'NeuronnaAIBot'}?start=buy_lifetime\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs uppercase font-mono tracking-wider shadow-sm transition text-center cursor-pointer"
                >
                  <Sparkles size={14} className="text-amber-300" />
                  <span>⚡ Konfirmasi Cepat via Telegram Bot (Direkomendasikan)</span>
                </a>`;
content = content.replace(searchBtn, ``);
fs.writeFileSync(path, content);


path = 'src/components/AuthModal.tsx';
if (fs.existsSync(path)) {
  content = fs.readFileSync(path, 'utf8');
  content = content.replace(/Lupa PIN\/Password Anda\? Hubungi Admin atau gunakan Telegram Bot untuk reset otomatis dalam hitungan detik\./g, 'Lupa PIN/Password Anda? Hubungi Admin untuk reset password.');
  
  let authTgBtn = `{/* Telegram Bot (Recommended) - Coming Soon */}
                      <button
                        type="button"
                        onClick={() => {
                          const tgBot = window.paymentConfig?.telegramBotUsername || 'NeuronnaAIBot';
                          window.open(\`https://t.me/\${tgBot}?start=forgot_password\`, '_blank');
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg text-[10px] font-bold border border-sky-500/20 transition cursor-pointer"
                      >
                        <Zap size={10} /> Reset via Telegram Bot
                      </button>`;
  content = content.replace(authTgBtn, '');
  fs.writeFileSync(path, content);
}


path = 'src/components/CreditTopUpModal.tsx';
if (fs.existsSync(path)) {
  content = fs.readFileSync(path, 'utf8');
  let topUpTgBtn = `{/* ⚡ RECOMMENDED FAST CONFIRMATION (TELEGRAM BOT) */}
              <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/40 space-y-2">
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-sky-300">
                  <Sparkles size={14} className="text-amber-300" />
                  <span>⚡ KONFIRMASI INSTAN VIA TELEGRAM (DIREKOMENDASIKAN)</span>
                </div>
                <p className="text-[10px] text-gray-400">
                  Hindari antrean admin. Bot kami akan mengecek mutasi secara otomatis dan langsung menambahkan kredit ke akun Anda dalam hitungan detik.
                </p>
                <a
                  href={\`https://t.me/\${paymentConfig.telegramBotUsername || 'NeuronnaAIBot'}?start=topup\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs uppercase font-mono transition"
                >
                  Buka Telegram Bot
                </a>
              </div>`;
  content = content.replace(topUpTgBtn, '');
  fs.writeFileSync(path, content);
}

