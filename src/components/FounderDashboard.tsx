import React, { useState, useEffect } from 'react';
import { Settings, Film, CreditCard, Video, 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  MessageSquare, 
  ExternalLink, 
  Coins, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Sparkles,
  Phone,
  Mail,
  User as UserIcon,
  Shield,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FounderVideoInspector } from './FounderVideoInspector';

export interface ActivatedUser {
  id: string;
  name: string;
  email: string;
  phone_wa: string;
  password_plain: string;
  role: 'founder' | 'admin' | 'creator' | 'user';
  credits: number;
  status_aktif: boolean;
  package_tier: string;
  activated_at: string;
}

interface FounderDashboardProps {
  onBack?: () => void;
}


const PaymentSettingsPanel = () => {
  const [whatsapp, setWhatsapp] = React.useState('+62');
  const [banks, setBanks] = React.useState([{ id: '1', bank: '', accountNumber: '', accountName: '' }]);
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => {
    fetch('/api/v1/founder/payment', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('neuronna_token') } })
      .then(r => r.json())
      .then(d => {
        if(d.paymentConfig) {
          if(d.paymentConfig.whatsappNumber) setWhatsapp(d.paymentConfig.whatsappNumber);
          if(d.paymentConfig.bankAccounts) setBanks(d.paymentConfig.bankAccounts);
        }
      });
  }, []);

  const save = async () => {
    setMsg('Saving...');
    try {
      const res = await fetch('/api/v1/founder/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('neuronna_token') },
        body: JSON.stringify({ whatsappNumber: whatsapp, bankAccounts: banks })
      });
      if(res.ok) setMsg('Saved successfully!');
      else setMsg('Error saving');
    } catch(e) {
      setMsg('Error saving');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="bg-[#050508] border border-white/10 rounded-xl p-6 max-w-2xl text-slate-300 w-full">
      <h3 className="text-xl font-bold text-white mb-4 font-mono">Payment & WhatsApp Configuration</h3>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 font-mono text-cyan-400">WhatsApp Admin Number</label>
        <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className="w-full bg-black border border-white/10 focus:border-cyan-500 rounded-lg p-2.5 text-white outline-none font-mono" />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 flex justify-between items-center font-mono text-cyan-400">
          Bank Accounts / E-Wallets
          <button onClick={() => setBanks([...banks, { id: Date.now().toString(), bank: '', accountNumber: '', accountName: '' }])} className="text-indigo-400 hover:text-indigo-300 text-xs px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">+ Add Account</button>
        </label>
        {banks.map((b, i) => (
          <div key={b.id} className="flex flex-col sm:flex-row gap-2 mb-3 bg-black/50 p-3 rounded-lg border border-white/5">
            <input placeholder="Bank (e.g. BCA)" value={b.bank} onChange={e => { const nb = [...banks]; nb[i].bank = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500" />
            <input placeholder="Account No." value={b.accountNumber} onChange={e => { const nb = [...banks]; nb[i].accountNumber = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500" />
            <input placeholder="Account Name" value={b.accountName} onChange={e => { const nb = [...banks]; nb[i].accountName = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-sm outline-none focus:border-indigo-500" />
            <button onClick={() => { const nb = [...banks]; nb.splice(i, 1); setBanks(nb); }} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition">X</button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-6">
        <button onClick={save} className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-6 py-2 rounded-lg font-bold font-mono tracking-wide transition-all shadow-lg shadow-cyan-500/20">Save Settings</button>
        {msg && <span className="text-sm font-mono text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
};

export const FounderDashboard: React.FC<FounderDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'activation_form' | 'stats' | 'payment' | 'inspector'>('users');
  
  // Form State for Manual Activation
  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [inputPhoneWa, setInputPhoneWa] = useState('');
  const [inputInitialCredits, setInputInitialCredits] = useState<number>(150);
  const [inputRole, setInputRole] = useState<'user' | 'creator' | 'admin'>('user');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Newly Activated User modal / display card
  const [lastActivatedUser, setLastActivatedUser] = useState<ActivatedUser | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Local user registry (Loaded from API / Local storage)
  const [userList, setUserList] = useState<ActivatedUser[]>([
    {
      id: 'usr_pioneer_001',
      name: 'Budi Pratama (Affiliate Top Creator)',
      email: 'budi.affiliate@gmail.com',
      phone_wa: '6281298765432',
      password_plain: '849201',
      role: 'user',
      credits: 150,
      status_aktif: true,
      package_tier: 'early_bird_lifetime',
      activated_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'usr_pioneer_002',
      name: 'Siti Rahma (3D Animator)',
      email: 'siti.animator@yahoo.com',
      phone_wa: '6285712345678',
      password_plain: '519382',
      role: 'user',
      credits: 120,
      status_aktif: true,
      package_tier: 'early_bird_lifetime',
      activated_at: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    showToast('Berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Helper: Generate 6-digit random PIN/Password
  const generateRandomPassword = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Format Phone number to international 62 format
  const sanitizePhone = (phone: string): string => {
    let clean = phone.replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (clean.startsWith('8')) {
      clean = '62' + clean;
    }
    return clean;
  };

  // Submit Manual Activation
  const handleManualActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim() || !inputEmail.trim() || !inputPhoneWa.trim()) {
      alert('Mohon lengkapi Nama, Email, dan No WhatsApp pembeli!');
      return;
    }

    const cleanPhone = sanitizePhone(inputPhoneWa);
    const randomPassword = generateRandomPassword();
    const newUserId = 'usr_' + Math.random().toString(36).substring(2, 9);

    const newUser: ActivatedUser = {
      id: newUserId,
      name: inputName.trim(),
      email: inputEmail.trim().toLowerCase(),
      phone_wa: cleanPhone,
      password_plain: randomPassword,
      role: inputRole,
      credits: Number(inputInitialCredits) || 150,
      status_aktif: true,
      package_tier: 'early_bird_lifetime',
      activated_at: new Date().toISOString()
    };

    // Save to local state
    setUserList(prev => [newUser, ...prev]);
    setLastActivatedUser(newUser);

    // Call Backend API to sync
    try {
      await fetch('/api/admin/users/' + newUserId + '/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer founder_token_demo'
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          credits: newUser.credits,
          phone_wa: newUser.phone_wa
        })
      });
    } catch (err) {
      console.warn('API sync notice:', err);
    }

    // Reset Form
    setInputName('');
    setInputEmail('');
    setInputPhoneWa('');
    showToast(`Akun ${newUser.email} berhasil diaktifkan dengan 150 kredit!`);
  };

  // Generate WhatsApp Message for Send Credentials
  const getWhatsAppCredentialsUrl = (user: ActivatedUser): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://neuronna.ai';
    const message = 
`🎉 *AKUN NEURONNA AI ANDA TELAH AKTIF!* 🎉

Halo Kak *${user.name}*,
Terima kasih atas pembayaran akses Early Bird Lifetime Neuronna AI (Rp 150.000).

Berikut adalah data akun login Anda:
━━━━━━━━━━━━━━━━━━━━
🌐 *URL Studio:* ${origin}
📧 *Email:* ${user.email}
🔑 *Password/PIN:* ${user.password_plain}
💰 *Saldo Kredit Awal:* ${user.credits} Kredit (Siap Render)
━━━━━━━━━━━━━━━━━━━━

💡 *Panduan Singkat:*
1. Pembuatan Storyboard & Hook AI adalah *GRATIS tanpa batas*.
2. Kredit hanya berkurang saat Anda merender Gambar HD atau Video AI (Google Veo / Runway).
3. Jika butuh bantuan atau panduan, hubungi kami di nomor ini kapan saja.

Selamat berkarya & merajai algoritma video affiliate! 🚀`;

    return `https://wa.me/${user.phone_wa}?text=${encodeURIComponent(message)}`;
  };

  const filteredUsers = userList.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone_wa.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-[#06060A] text-[#E0E0E0] font-sans selection:bg-cyan-500/30 selection:text-white p-4 sm:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-mono shadow-2xl backdrop-blur-md"
          >
            <CheckCircle2 size={15} className="text-emerald-400" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-7 h-7 rounded-lg bg-indigo-950/80 border border-indigo-500/30 flex items-center justify-center">
                <Shield className="w-4 h-4 text-indigo-400" />
              </div>
              <h1 className="text-xl font-black tracking-wider uppercase text-white">
                FOUNDER CONTROL PLANE
              </h1>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] uppercase font-bold">
                RBAC & User Management
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono">
              Kelola otorisasi hak akses, verifikasi pembayaran manual WhatsApp & aktivasi kredit instan.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                Kembali ke Studio
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-white/10 mb-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Users size={15} />
            <span>Daftar Pengguna ({userList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activation_form')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'activation_form'
                ? 'border-amber-400 text-amber-300 font-bold bg-amber-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <UserPlus size={15} />
            <span>+ Aktivasi Manual Pembeli WA</span>
          </button>

          <button
            onClick={() => setActiveTab('payment')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'payment'
                ? 'border-indigo-400 text-indigo-300 font-bold bg-indigo-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={15} />
            <span>Rekening & WhatsApp</span>
          </button>
          
          <button
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'inspector'
                ? 'border-fuchsia-400 text-fuchsia-300 font-bold bg-fuchsia-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Film size={15} />
            <span>Video Inspector</span>
          </button>
        </div>

        {/* TAB 1: USER LIST & SEARCH */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0A0A12] border border-white/10 rounded-xl p-3">
              <div className="relative w-full sm:w-96">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Cari nama, email, atau no WhatsApp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-black/60 border border-white/10 text-xs font-mono text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <button
                onClick={() => setActiveTab('activation_form')}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-mono font-bold text-xs uppercase tracking-wider shadow-sm cursor-pointer"
              >
                <UserPlus size={14} className="fill-black" />
                <span>Aktivasi Pembeli Baru</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-white/10 bg-[#090910] overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-black/60 text-gray-400 border-b border-white/10 uppercase text-[10px] tracking-wider">
                      <th className="py-3.5 px-4 font-semibold">Nama & Email Pengguna</th>
                      <th className="py-3.5 px-4 font-semibold">WhatsApp</th>
                      <th className="py-3.5 px-4 font-semibold">Role & Status</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Saldo Kredit</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Aksi Pengiriman WA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500 font-mono text-xs">
                          Tidak ditemukan pengguna dengan kueri tersebut.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white text-xs">{user.name}</div>
                            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <Mail size={11} />
                              <span>{user.email}</span>
                            </div>
                            <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                              ID: {user.id} • PIN: {user.password_plain}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-gray-300">
                            <div className="flex items-center gap-1.5 font-mono">
                              <Phone size={12} className="text-emerald-400" />
                              <span>+{user.phone_wa}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                                user.status_aktif 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-red-500/10 text-red-400 border border-red-500/30'
                              }`}>
                                {user.status_aktif ? 'AKTIF' : 'NON-AKTIF'}
                              </span>
                              <span className="text-[10px] text-gray-400 uppercase">
                                [{user.role}]
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <span className="font-bold text-amber-400 text-sm font-mono">
                              {user.credits}
                            </span>
                            <span className="text-[10px] text-gray-500 ml-1">Kredit</span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <a
                                href={getWhatsAppCredentialsUrl(user)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition-all"
                                title="Kirim Akun ke WhatsApp Pembeli"
                              >
                                <MessageSquare size={13} className="text-emerald-400" />
                                <span>Kirim Akses WA</span>
                              </a>

                              <button
                                onClick={() => handleCopy(`Email: ${user.email} | PIN: ${user.password_plain}`, user.id)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                                title="Salin Info Login"
                              >
                                {copiedField === user.id ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANUAL ACTIVATION FORM */}
        
        {activeTab === 'payment' && (
          <PaymentSettingsPanel />
        )}
        {activeTab === 'inspector' && (
          <FounderVideoInspector />
        )}

        {activeTab === 'activation_form' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Input Section */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-white/10 bg-[#0A0A14] p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <UserPlus size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wider text-white">
                      Formulir Aktivasi Akun Pembeli (Rp 150.000)
                    </h2>
                    <p className="text-[11px] text-gray-400 font-mono">
                      Isi data pembeli dari WhatsApp. Sistem otomatis men-generate Password 6 Digit dan saldo 150 Kredit.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleManualActivation} className="space-y-4 font-mono">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                      Nama Lengkap Pembeli
                    </label>
                    <div className="relative">
                      <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Rian Anggara"
                        value={inputName}
                        onChange={(e) => setInputName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                      Email Pembeli
                    </label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="email"
                        required
                        placeholder="Contoh: rian.creator@gmail.com"
                        value={inputEmail}
                        onChange={(e) => setInputEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                      Nomor WhatsApp Pembeli
                    </label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        required
                        placeholder="Contoh: 081234567890 atau 6281234567890"
                        value={inputPhoneWa}
                        onChange={(e) => setInputPhoneWa(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                        Saldo Kredit Awal
                      </label>
                      <div className="relative">
                        <Coins size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400" />
                        <input
                          type="number"
                          value={inputInitialCredits}
                          onChange={(e) => setInputInitialCredits(Number(e.target.value))}
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-300 mb-1.5">
                        Role RBAC
                      </label>
                      <select
                        value={inputRole}
                        onChange={(e) => setInputRole(e.target.value as any)}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500/50"
                      >
                        <option value="user">User (Standard)</option>
                        <option value="creator">Creator (Pro Studio)</option>
                        <option value="admin">Admin Operator</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Sparkles size={16} className="fill-black" />
                      <span>Aktifkan Akun & Generate Password</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Display Generated Account Card */}
            <div className="lg:col-span-5">
              {lastActivatedUser ? (
                <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 to-[#070e0a] p-6 sm:p-7 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <span className="text-xs font-bold font-mono uppercase tracking-wider text-emerald-300">
                        Akun Berhasil Diaktifkan!
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                      STATUS: AKTIF
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 mb-5 leading-relaxed">
                    Data kredensial pengguna baru telah digenerate. Anda dapat menyalin data atau langsung mengirimkannya ke WhatsApp pembeli.
                  </p>

                  <div className="bg-black/60 rounded-xl p-4 border border-white/10 space-y-3 font-mono text-xs mb-6">
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase block">Nama Pengguna:</span>
                      <span className="text-white font-bold">{lastActivatedUser.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase block">Email Login:</span>
                      <span className="text-cyan-300 font-bold">{lastActivatedUser.email}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-500 text-[10px] uppercase block">Password / PIN:</span>
                        <span className="text-amber-400 font-black text-sm tracking-widest">{lastActivatedUser.password_plain}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(lastActivatedUser.password_plain, 'pwd_copy')}
                        className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] text-gray-300 flex items-center gap-1"
                      >
                        {copiedField === 'pwd_copy' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>Salin PIN</span>
                      </button>
                    </div>
                    <div>
                      <span className="text-gray-500 text-[10px] uppercase block">Saldo Kredit Terisi:</span>
                      <span className="text-emerald-400 font-bold">{lastActivatedUser.credits} Kredit (Rp 150.000 Early Bird)</span>
                    </div>
                  </div>

                  {/* Send Access via WA Button */}
                  <div className="space-y-2">
                    <a
                      id="btn-send-wa-credentials"
                      href={getWhatsAppCredentialsUrl(lastActivatedUser)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-extrabold text-xs uppercase font-mono tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <MessageSquare size={16} className="fill-black" />
                      <span>Kirim Akses Login via WA (+{lastActivatedUser.phone_wa})</span>
                    </a>

                    <button
                      onClick={() => handleCopy(
                        `Email: ${lastActivatedUser.email}\nPassword: ${lastActivatedUser.password_plain}\nSaldo: ${lastActivatedUser.credits} Kredit`,
                        'all_creds'
                      )}
                      className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-mono text-gray-400 hover:text-white text-center"
                    >
                      {copiedField === 'all_creds' ? 'Semua Data Tersalin!' : 'Salin Seluruh Kredensial Teks'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 p-8 text-center text-gray-500 font-mono text-xs">
                  <UserPlus size={32} className="mx-auto mb-3 text-gray-600" />
                  <p>Isi dan submit form di sebelah kiri untuk mengaktifkan akun dan men-generate password otomatis.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default FounderDashboard;
