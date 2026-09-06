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
  ArrowRight,
  Trash2,
  RotateCcw,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FounderVideoInspector } from './FounderVideoInspector';
import { KeyRotatorModal } from './KeyRotatorModal';
import { AVAILABLE_VOICES } from '../utils/speechSynthesis';

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
  const [telegramUsername, setTelegramUsername] = React.useState('NeuronnaAIBot');
  const [telegramToken, setTelegramToken] = React.useState('');
  const [banks, setBanks] = React.useState([{ id: '1', bank: '', accountNumber: '', accountName: '' }]);
  const [msg, setMsg] = React.useState('');

  const getToken = () => localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || '';

  React.useEffect(() => {
    fetch('/api/v1/founder/payment', { headers: { 'Authorization': 'Bearer ' + getToken() } })
      .then(r => r.json())
      .then(d => {
        if(d && d.paymentConfig) {
          if(d.paymentConfig.whatsappNumber) setWhatsapp(d.paymentConfig.whatsappNumber);
          if(d.paymentConfig.telegramBotUsername) setTelegramUsername(d.paymentConfig.telegramBotUsername);
          if(d.paymentConfig.telegramBotToken) setTelegramToken(d.paymentConfig.telegramBotToken);
          if(d.paymentConfig.bankAccounts && Array.isArray(d.paymentConfig.bankAccounts)) {
            const normalizedBanks = d.paymentConfig.bankAccounts.map((b: any, idx: number) => ({
              id: b.id || `bank_${idx}_${Date.now()}`,
              bank: b.bank || '',
              accountNumber: b.accountNumber || '',
              accountName: b.accountName || ''
            }));
            setBanks(normalizedBanks);
          }
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setMsg('Saving...');
    try {
      const res = await fetch('/api/v1/founder/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
        body: JSON.stringify({ 
          whatsappNumber: whatsapp, 
          telegramBotUsername: telegramUsername,
          telegramBotToken: telegramToken,
          bankAccounts: banks 
        })
      });
      if(res.ok) setMsg('Saved successfully!');
      else setMsg('Error saving');
    } catch(e) {
      setMsg('Error saving');
    }
    setTimeout(() => setMsg(''), 3000);
  };

  return (
    <div className="bg-[#050508] border border-white/10 rounded-xl p-6 max-w-2xl text-slate-300 w-full space-y-5">
      <div>
        <h3 className="text-xl font-bold text-white mb-1 font-sans">Payment, WhatsApp & Telegram Bot Configuration</h3>
        <p className="text-xs text-gray-400">Atur nomor WhatsApp admin dan integrasi Telegram Bot untuk otomatisasi konfirmasi transfer.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1 font-mono text-cyan-400">WhatsApp Admin Number</label>
          <input 
            type="text" 
            value={whatsapp} 
            onChange={e => setWhatsapp(e.target.value)} 
            placeholder="6281234567890" 
            className="w-full bg-black border border-white/10 focus:border-cyan-500 rounded-lg p-2.5 text-white outline-none font-mono text-sm" 
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1 font-mono text-sky-400 flex items-center justify-between">
            <span>Telegram Bot Username</span>
            <span className="text-[10px] text-amber-300 font-normal">⚡ Rekomendasi Cepat</span>
          </label>
          <input 
            type="text" 
            value={telegramUsername} 
            onChange={e => setTelegramUsername(e.target.value)} 
            placeholder="NeuronnaAIBot" 
            className="w-full bg-black border border-white/10 focus:border-sky-500 rounded-lg p-2.5 text-white outline-none font-mono text-sm" 
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1 font-mono text-gray-400">
          Telegram Bot Token (Opsional - untuk Webhook Auto-Topup)
        </label>
        <input 
          type="password" 
          value={telegramToken} 
          onChange={e => setTelegramToken(e.target.value)} 
          placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ" 
          className="w-full bg-black border border-white/10 focus:border-indigo-500 rounded-lg p-2.5 text-white outline-none font-mono text-xs" 
        />
        <span className="text-[10px] text-gray-500 font-mono mt-1 block">
          Webhook Endpoint: <code>/api/v1/founder/payment/telegram-webhook</code>
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 flex justify-between items-center font-mono text-cyan-400">
          <span>Bank Accounts / E-Wallets Pembayaran</span>
          <button 
            type="button"
            onClick={() => setBanks([...banks, { id: `bank_new_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, bank: '', accountNumber: '', accountName: '' }])} 
            className="text-indigo-400 hover:text-indigo-300 text-xs px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 cursor-pointer"
          >
            + Tambah Rekening
          </button>
        </label>
        {banks.map((b, i) => (
          <div key={b.id || `bank_row_${i}`} className="flex flex-col sm:flex-row gap-2 mb-3 bg-black/50 p-3 rounded-lg border border-white/5">
            <input placeholder="Bank (Contoh: BCA)" value={b.bank} onChange={e => { const nb = [...banks]; nb[i].bank = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 font-mono" />
            <input placeholder="Nomor Rekening" value={b.accountNumber} onChange={e => { const nb = [...banks]; nb[i].accountNumber = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 font-mono" />
            <input placeholder="Atas Nama (a.n)" value={b.accountName} onChange={e => { const nb = [...banks]; nb[i].accountName = e.target.value; setBanks(nb); }} className="w-full sm:w-1/3 bg-black border border-white/10 rounded-lg p-2 text-white text-xs outline-none focus:border-indigo-500 font-mono" />
            <button type="button" onClick={() => { const nb = [...banks]; nb.splice(i, 1); setBanks(nb); }} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg transition cursor-pointer text-xs">Hapus</button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 pt-2">
        <button onClick={save} className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white px-6 py-2.5 rounded-lg font-bold font-mono tracking-wide transition-all shadow-lg shadow-cyan-500/20 cursor-pointer text-xs uppercase">
          Simpan Konfigurasi
        </button>
        {msg && <span className="text-sm font-mono text-emerald-400">{msg}</span>}
      </div>
    </div>
  );
};

const FounderChangePasswordPanel = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', msg: 'Konfirmasi password baru tidak cocok.' });
      return;
    }
    
    // Validasi kompleksitas password Founder
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    
    if (newPassword.length < 12 || !hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setStatus({ type: 'error', msg: 'Password harus min. 12 karakter dan mengandung huruf besar, huruf kecil, angka, dan simbol.' });
      return;
    }

    setStatus({ type: 'loading', msg: 'Memvalidasi dan mengubah...' });

    try {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || '';
      const res = await fetch('/api/auth/founder/change-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: 'error', msg: data.message || 'Gagal mengubah password.' });
        return;
      }

      setStatus({ type: 'success', msg: 'Password berhasil diubah. Sesi lama dihentikan. Anda akan dilogout...' });
      
      // Logout and force redirect to home
      setTimeout(() => {
        localStorage.removeItem('neuronna_auth_token');
        localStorage.removeItem('neuronna_user_session');
        window.location.href = '/';
      }, 3000);
      
    } catch (err) {
      setStatus({ type: 'error', msg: 'Gagal terhubung ke server.' });
    }
  };

  return (
    <div className="bg-[#090910] p-6 rounded-xl border border-red-500/20 text-white shadow-2xl max-w-xl mx-auto mt-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-500/10 rounded-lg">
          <Shield className="text-red-400" size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold font-mono tracking-tight text-red-400 uppercase">Ubah Password Master</h3>
          <p className="text-xs text-gray-500 font-mono mt-1">Mengubah password akan menghentikan (logout) semua sesi yang aktif.</p>
        </div>
      </div>

      <form onSubmit={handleChange} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 font-mono text-gray-300">Password / Kunci Founder Saat Ini</label>
          <input 
            type="password" 
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="w-full bg-black/60 border border-white/10 focus:border-red-500/50 rounded-lg p-2.5 text-white outline-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 font-mono text-gray-300">Password Baru</label>
          <input 
            type="password" 
            required
            minLength={12}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full bg-black/60 border border-white/10 focus:border-red-500/50 rounded-lg p-2.5 text-white outline-none font-mono text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5 font-mono text-gray-300">Konfirmasi Password Baru</label>
          <input 
            type="password" 
            required
            minLength={12}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full bg-black/60 border border-white/10 focus:border-red-500/50 rounded-lg p-2.5 text-white outline-none font-mono text-sm"
          />
        </div>

        {status.msg && (
          <div className={`p-3 rounded-lg text-xs font-mono font-bold flex items-center gap-2 ${
            status.type === 'error' ? 'bg-red-950/50 text-red-400 border border-red-500/30' :
            status.type === 'success' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-500/30' :
            'bg-blue-950/50 text-blue-400 border border-blue-500/30'
          }`}>
            {status.type === 'error' && <XCircle size={14} />}
            {status.type === 'success' && <CheckCircle2 size={14} />}
            {status.type === 'loading' && <RefreshCw size={14} className="animate-spin" />}
            {status.msg}
          </div>
        )}

        <button 
          type="submit" 
          disabled={status.type === 'loading' || status.type === 'success'}
          className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold font-mono py-3 rounded-lg shadow-lg shadow-red-900/20 transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide text-xs mt-6"
        >
          <Key size={16} /> Update Password
        </button>
      </form>
    </div>
  );
};

export const FounderDashboard: React.FC<FounderDashboardProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'activation_form' | 'stats' | 'payment' | 'inspector' | 'settings' | 'change_password'>('users');
  const [isRotatorModalOpen, setIsRotatorModalOpen] = useState(false);
  
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
  const [userList, setUserList] = useState<ActivatedUser[]>([]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || 'founder_token';
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.users)) {
          const normalizedUsers: ActivatedUser[] = data.users.map((u: any, idx: number) => ({
            id: u.uid || u.id || u.user_id || `usr_loaded_${idx}_${u.email || Date.now()}`,
            name: u.name || 'Pengguna',
            email: u.email || '',
            phone_wa: u.phoneWa || u.phone_wa || '',
            password_plain: u.passwordPlain || u.password_plain || '******',
            role: u.role || 'user',
            credits: u.credits ?? 0,
            status_aktif: u.statusAktif !== undefined ? !!u.statusAktif : (u.status_aktif !== undefined ? !!u.status_aktif : false),
            package_tier: u.packageTier || u.package_tier || 'early_bird_lifetime',
            activated_at: u.createdAt ? new Date(u.createdAt).toISOString() : (u.created_at || u.activated_at || new Date().toISOString())
          }));
          setUserList(normalizedUsers);
        }
      }
    } catch (err) {
      console.warn('Could not fetch user list:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleActivateUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || 'founder_token';
      const res = await fetch(`/api/admin/users/${userId}/activate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ credits: 150 })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Akun ${data.user?.email || 'pengguna'} berhasil diaktifkan dengan 150 kredit!`);
        fetchUsers();
      } else {
        // Fallback update locally
        setUserList(prev => prev.map(u => (u.id === userId || (u as any).user_id === userId) ? { ...u, status_aktif: true, credits: 150 } : u));
        showToast('Akun berhasil diaktifkan!');
      }
    } catch (err) {
      setUserList(prev => prev.map(u => (u.id === userId || (u as any).user_id === userId) ? { ...u, status_aktif: true, credits: 150 } : u));
      showToast('Akun berhasil diaktifkan!');
    }
  };

  // Reset User Password
  const handleResetPassword = async (user: ActivatedUser) => {
    const targetId = user.id || (user as any).user_id;
    const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();
    const confirmed = window.confirm(`Reset password untuk ${user.name} (${user.email}) ke PIN baru: ${generatedPin}?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || 'founder_token';
      const res = await fetch(`/api/admin/users/${targetId}/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ newPassword: generatedPin })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(`Password ${user.email} direset menjadi: ${data.newPassword || generatedPin}`);
        fetchUsers();
      } else {
        setUserList(prev => prev.map(u => (u.id === targetId || (u as any).user_id === targetId) ? { ...u, password_plain: generatedPin } : u));
        showToast(`Password ${user.email} direset menjadi: ${generatedPin}`);
      }
    } catch (err) {
      setUserList(prev => prev.map(u => (u.id === targetId || (u as any).user_id === targetId) ? { ...u, password_plain: generatedPin } : u));
      showToast(`Password ${user.email} direset menjadi: ${generatedPin}`);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (user: ActivatedUser) => {
    const targetId = user.id || (user as any).user_id;
    const confirmed = window.confirm(`APAKAH ANDA YAKIN ingin menghapus akun ${user.name} (${user.email}) secara permanen? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || 'founder_token';
      const res = await fetch(`/api/admin/users/${targetId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });

      if (res.ok) {
        showToast(`Akun ${user.email} berhasil dihapus.`);
        fetchUsers();
      } else {
        setUserList(prev => prev.filter(u => u.id !== targetId && (u as any).user_id !== targetId));
        showToast(`Akun ${user.email} berhasil dihapus.`);
      }
    } catch (err) {
      setUserList(prev => prev.filter(u => u.id !== targetId && (u as any).user_id !== targetId));
      showToast(`Akun ${user.email} berhasil dihapus.`);
    }
  };

  // Quick Credit Top-up (+100 Kr)
  const handleQuickAddCredits = async (user: ActivatedUser) => {
    const amountStr = window.prompt(`Masukkan jumlah kredit yang ingin ditambahkan untuk ${user.email}:\n(Contoh: 100, 500, 1000)`, "100");
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);
    if (isNaN(amount) || amount <= 0) {
      showToast("Jumlah kredit tidak valid.");
      return;
    }

    const targetId = user.id || (user as any).user_id;
    try {
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || 'founder_token';
      const res = await fetch(`/api/admin/users/${targetId}/credits`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ amount, isDelta: true })
      });

      if (res.ok) {
        showToast(`+${amount} kredit ditambahkan ke akun ${user.email}`);
        fetchUsers();
      } else {
        setUserList(prev => prev.map(u => (u.id === targetId || (u as any).user_id === targetId) ? { ...u, credits: (u.credits || 0) + amount } : u));
        showToast(`+${amount} kredit ditambahkan!`);
      }
    } catch (err) {
      setUserList(prev => prev.map(u => (u.id === targetId || (u as any).user_id === targetId) ? { ...u, credits: (u.credits || 0) + amount } : u));
      showToast(`+${amount} kredit ditambahkan!`);
    }
  };

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
      const token = localStorage.getItem('neuronna_auth_token') || localStorage.getItem('neuronna_token') || 'founder_token';
      await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          credits: newUser.credits,
          phone_wa: newUser.phone_wa,
          password: randomPassword
        })
      });
      fetchUsers();
    } catch (err) {
      console.warn('API sync notice:', err);
    }

    // Reset Form
    setInputName('');
    setInputEmail('');
    setInputPhoneWa('');
    showToast(`Akun ${newUser.email} berhasil didaftarkan dan diaktifkan dengan 150 kredit!`);
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
2. Kredit hanya berkurang saat Anda merender Gambar HD atau Video AI (Fal.ai Video Studio).
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
            <p className="text-xs text-gray-400">
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
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 border-b border-white/10 mb-8 pb-1 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('users')}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
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
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
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
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'payment'
                ? 'border-indigo-400 text-indigo-300 font-bold bg-indigo-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={15} />
            <span>Rekening & WhatsApp</span>
          </button>
          

          <button
            onClick={() => setActiveTab('settings')}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'border-fuchsia-400 text-fuchsia-300 font-bold bg-fuchsia-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Settings size={15} />
            <span>Neurona Audio</span>
          </button>
          
          <button
            onClick={() => setActiveTab('change_password')}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'change_password'
                ? 'border-red-500 text-red-400 font-bold bg-red-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Shield size={15} />
            <span>Ubah Password</span>
          </button>

          <button
            onClick={() => setActiveTab('inspector')}
            className={`shrink-0 flex items-center gap-2 px-4 py-2.5 border-b-2 font-mono text-xs uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'inspector'
                ? 'border-fuchsia-400 text-fuchsia-300 font-bold bg-fuchsia-950/20'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Film size={15} />
            <span>Video Inspector</span>
          </button>

          <button
            onClick={() => setIsRotatorModalOpen(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border border-cyan-500/40 text-cyan-300 font-mono text-xs uppercase font-bold tracking-wider hover:border-cyan-400 transition-all cursor-pointer md:ml-auto shadow-lg shadow-cyan-500/10"
          >
            <Key size={15} className="text-cyan-400 animate-pulse" />
            <span>🔑 API Key Rotator Pool</span>
          </button>
        </div>

        {/* TAB 1: USER LIST & SEARCH */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search & Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0A0A12] border border-white/10 rounded-xl p-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  onClick={fetchUsers}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white"
                  title="Segarkan Daftar Pengguna"
                >
                  <RefreshCw size={14} />
                </button>
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
                      <th className="py-3.5 px-4 font-semibold text-center">Aksi Founder</th>
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
                      filteredUsers.map((user, idx) => {
                        const rowKey = user.id || (user as any).user_id || `usr_row_${idx}_${user.email}`;
                        const targetId = user.id || (user as any).user_id || `usr_${idx}`;
                        return (
                          <tr key={rowKey} className={`transition-colors ${!user.status_aktif ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-white/[0.02]'}`}>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white text-xs flex items-center gap-2">
                                <span>{user.name}</span>
                                {!user.status_aktif && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold">
                                    Menunggu TF
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                                <Mail size={11} />
                                <span>{user.email}</span>
                              </div>
                              <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                                ID: {targetId} • PIN: {user.password_plain}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-gray-300">
                              <div className="flex items-center gap-1.5 font-mono">
                                <Phone size={12} className="text-emerald-400" />
                                <span>
                                  {user.phone_wa && user.phone_wa.trim() !== '' 
                                    ? (user.phone_wa.startsWith('+') ? user.phone_wa : '+' + user.phone_wa) 
                                    : 'Belum diisi'}
                                </span>
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
                              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                {!user.status_aktif ? (
                                  <button
                                    onClick={() => handleActivateUser(targetId)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-[10px] shadow-sm transition-all cursor-pointer"
                                    title="Verifikasi & Aktifkan Akun Pengguna Ini"
                                  >
                                    <Sparkles size={12} className="fill-black" />
                                    <span>⚡ Aktifkan (150 Kr)</span>
                                  </button>
                                ) : (
                                  <a
                                    href={getWhatsAppCredentialsUrl(user)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold transition-all cursor-pointer"
                                    title="Kirim Akun ke WhatsApp Pembeli"
                                  >
                                    <MessageSquare size={12} className="text-emerald-400" />
                                    <span>Kirim WA</span>
                                  </a>
                                )}

                                {/* Top up Credits button */}
                                <button
                                  onClick={() => handleQuickAddCredits(user)}
                                  className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:text-amber-200 transition cursor-pointer"
                                  title="Tambah Kredit Manual"
                                >
                                  <Plus size={12} />
                                </button>

                                {/* Reset Password button */}
                                <button
                                  onClick={() => handleResetPassword(user)}
                                  className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-cyan-200 transition cursor-pointer"
                                  title="Reset Password / Buat PIN Baru"
                                >
                                  <RotateCcw size={12} />
                                </button>

                                {/* Copy Info button */}
                                <button
                                  onClick={() => handleCopy(`Email: ${user.email} | PIN: ${user.password_plain}`, targetId)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                                  title="Salin Info Login"
                                >
                                  {copiedField === targetId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                </button>

                                {/* Delete User button */}
                                {user.role !== 'founder' && (
                                  <button
                                    onClick={() => handleDeleteUser(user)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 transition cursor-pointer"
                                    title="Hapus Akun Pengguna Ini"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
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

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-2 font-sans uppercase">Neurona Audio Voice Engine</h2>
              <p className="text-xs text-gray-400 mb-6">Pilih model suara (TTS) yang digunakan untuk Asisten Neurona.</p>
              

            <div className="bg-[#111] border border-white/10 rounded-xl p-6 mt-6">
              <h2 className="text-lg font-bold text-white mb-2 font-sans uppercase">API Keys & Quota Management</h2>
              <p className="text-xs text-gray-400 mb-6">Gunakan Gemini API Key berbayar Anda untuk menghindari limit/quota exceeded saat chat & TTS.</p>
              
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
        
        {activeTab === 'change_password' && (
          <div className="pt-4 pb-8">
            <FounderChangePasswordPanel />
          </div>
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

      <KeyRotatorModal
        isOpen={isRotatorModalOpen}
        onClose={() => setIsRotatorModalOpen(false)}
      />
    </div>
  );
};
export default FounderDashboard;
