const fs = require('fs');
let path = 'src/components/AuthModal.tsx';
let content = fs.readFileSync(path, 'utf8');

// The messed up part is between `{/* Close Button */}` and `{/* Already active login button */}`
const searchStr = `{/* Close Button */}                      </div>
              {/* Already active login button */}`;

const replaceStr = `{/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition z-10"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-cyan-900/40 flex items-center justify-center border border-cyan-500/30">
              <Key className="text-cyan-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Masuk ke Studio Neuronna</h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">Masukkan Email dan Password yang telah Anda daftarkan</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle size={14} className="shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form wrapper */}
          <form onSubmit={handleUserLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Email Akun Terdaftar</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Password Akun</label>
                <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition">Lupa Password?</button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Masukkan password Anda"
                  className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 pl-9 pr-9 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  required
                />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
                {showForgotPassword && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2 mt-2">
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        Lupa PIN/Password Anda? Hubungi Admin untuk reset password.
                      </p>
                      {/* Already active login button */}`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync(path, content);
  console.log('Patched AuthModal.tsx');
} else {
  console.log('Could not find search string in AuthModal.tsx');
}
