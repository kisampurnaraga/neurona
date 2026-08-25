const fs = require('fs');

const path = 'src/components/AuthModal.tsx';
let content = fs.readFileSync(path, 'utf8');

const renderStart = content.indexOf('  return (');
if (renderStart === -1) {
  console.log('Cannot find return statement');
  process.exit(1);
}

const beforeRender = content.substring(0, renderStart);

const newRender = `  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-lg bg-[#0A0B12] border border-white/15 rounded-2xl shadow-2xl shadow-cyan-950/30 overflow-hidden text-white font-sans my-8"
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-cyan-400 to-indigo-500" />
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition z-10"
        >
          <X size={18} />
        </button>

        <div className="p-6">
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

          {mode === 'login' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-cyan-900/40 flex items-center justify-center border border-cyan-500/30">
                  <Key className="text-cyan-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Masuk ke Studio Neuronna</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Masukkan Email dan Password yang telah Anda daftarkan</p>
                </div>
              </div>
              <form onSubmit={handleUserLogin} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Email Akun Terdaftar</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="nama@email.com" className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 pl-9 pr-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition" required />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider">Password Akun</label>
                    <button type="button" onClick={() => setShowForgotPassword(true)} className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono transition">Lupa Password?</button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type={showLoginPassword ? 'text' : 'password'} value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Masukkan password Anda" className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 pl-9 pr-9 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition" required />
                    <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                {showForgotPassword && (
                  <div className="p-3 bg-white/5 border border-white/10 rounded-lg space-y-2 mt-2">
                    <p className="text-[11px] text-gray-300 leading-relaxed">Lupa PIN/Password Anda? Hubungi Admin untuk reset password.</p>
                    <a href={\`https://wa.me/\${cleanWaNumber}?text=\${encodeURIComponent('Halo Admin Neuronna, saya lupa password akun saya.')}\`} target="_blank" rel="noopener noreferrer" className="block py-2 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-mono text-[11px] text-center">Reset via WhatsApp</a>
                  </div>
                )}
                {inactiveAccountData && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-2 mt-2">
                    <p className="text-[11px] text-amber-200 leading-relaxed">{inactiveAccountData.message}</p>
                    {inactiveAccountData.activation_url && (
                      <a href={inactiveAccountData.activation_url} target="_blank" rel="noopener noreferrer" className="block py-2 px-3 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-mono text-[11px] text-center">Aktivasi via WhatsApp</a>
                    )}
                  </div>
                )}
                <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-cyan-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold font-mono text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {isLoading ? 'Memverifikasi Akun...' : 'Masuk ke Studio'}
                </button>
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-center mt-3">
                  <p className="text-[11px] text-gray-400 mb-1">Belum memiliki akun atau ingin melakukan aktivasi?</p>
                  <button type="button" onClick={() => { setMode('register'); setErrorMsg(null); }} className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition">Daftar & Aktivasi Rp 150.000 Sekarang &rarr;</button>
                </div>
              </form>
            </>
          )}

          {mode === 'register' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-900/40 flex items-center justify-center border border-amber-500/30">
                  <UserPlus className="text-amber-400" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Daftar & Aktivasi Akun</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Dapatkan akses seumur hidup ke Studio Neuronna</p>
                </div>
              </div>
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
                  <input type="text" value={regName} onChange={e => setRegName(e.target.value)} placeholder="Masukkan nama Anda" className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition" required />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Alamat Email</label>
                  <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="nama@email.com" className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition" required />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">No WhatsApp</label>
                  <input type="tel" value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="0812xxxx" className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition" required />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1.5">Buat Password / PIN</label>
                  <div className="relative">
                    <input type={showRegPassword ? 'text' : 'password'} value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="Minimal 4 karakter" className="w-full bg-[#12141F] border border-white/10 rounded-lg py-2.5 pl-3 pr-9 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition" required />
                    <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold font-mono text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  {isLoading ? 'Memproses Pendaftaran...' : 'Lanjutkan Pembayaran'}
                </button>
                <div className="text-center mt-3">
                  <button type="button" onClick={() => { setMode('login'); setErrorMsg(null); }} className="text-[11px] text-gray-400 hover:text-white transition">Sudah punya akun? Masuk di sini</button>
                </div>
              </form>
            </>
          )}

          {mode === 'checkout' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-900/40 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Selesaikan Pembayaran</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Transfer Rp 150.000 ke rekening berikut</p>
                </div>
              </div>
              <div className="space-y-4">
                {paymentConfig.bankAccounts.map((acc, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-cyan-400 font-bold mb-1">{acc.bank}</div>
                      <div className="text-lg font-mono text-white tracking-widest">{acc.accountNumber}</div>
                      <div className="text-[10px] text-gray-400 uppercase mt-1">A.N. {acc.accountName}</div>
                    </div>
                    <button onClick={() => handleCopy(acc.accountNumber, acc.id || String(idx))} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300">
                      {copiedBankId === (acc.id || String(idx)) ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    </button>
                  </div>
                ))}
                
                <a href={getCheckoutWhatsappUrl()} target="_blank" rel="noopener noreferrer" className="block w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-mono text-xs uppercase tracking-wider text-center transition cursor-pointer">
                  Konfirmasi via WhatsApp Admin
                </a>
                
                <div className="text-center mt-3">
                  <button type="button" onClick={() => { setMode('login'); setErrorMsg(null); }} className="text-[11px] text-gray-400 hover:text-white transition">Sudah transfer dan diaktifkan? Masuk ke Studio</button>
                </div>
              </div>
            </>
          )}

          {mode === 'founder' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-indigo-900/40 flex items-center justify-center border border-indigo-500/30">
                  <ShieldCheck size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white leading-tight">Founder Access</h2>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">Portal khusus pengaturan sistem</p>
                </div>
              </div>
              <form onSubmit={handleFounderLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-300 uppercase tracking-wider mb-1.5">Founder Master Key</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="password" value={founderKey} onChange={e => setFounderKey(e.target.value)} placeholder="Masukkan Kunci" className="w-full bg-[#12141F] border border-white/10 rounded-xl py-2.5 pl-10 pr-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition" required />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold font-mono text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center">
                  {isLoading ? 'Memverifikasi...' : 'Buka Founder Portal'}
                </button>
              </form>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
`;

fs.writeFileSync(path, beforeRender + newRender);
