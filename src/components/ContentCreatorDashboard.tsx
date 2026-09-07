import React, { useState, useEffect } from 'react';
import { 
  X, Youtube, BarChart2, MessageSquare, Zap, TrendingUp, Users, Video, 
  LogOut, Calendar, Sparkles, Clock, Target, DollarSign, CheckCircle2, 
  ArrowRight, ShieldCheck, Flame, Play, Film, BookOpen, Layers, RefreshCw,
  HelpCircle, ChevronRight, AlertCircle, Compass, Award, ExternalLink
} from 'lucide-react';
import { googleSignIn, initAuth, getAccessToken, logout } from '../utils/googleAuth';
import type { User } from 'firebase/auth';

interface ContentCreatorDashboardProps {
  onClose: () => void;
  onOpenAnimationStudio?: (initialValues?: any) => void;
  onOpenEducationalStudio?: (initialValues?: any) => void;
}

interface ScheduleItem {
  id: string;
  day: string;
  format: 'SHORTS' | 'LONG_FORM';
  preferredStudio: 'ANIMATION' | 'EDUCATIONAL';
  title: string;
  hook3s: string;
  concept: string;
  niche: string;
  targetDuration: string;
  retentionTip: string;
  aspectRatio: '9:16' | '16:9';
  characterDescription?: string;
  worldSetting?: string;
  category?: string;
}

const DEFAULT_SCHEDULE: ScheduleItem[] = [
  {
    id: 'sch_1',
    day: 'Hari 1 (Senin)',
    format: 'SHORTS',
    preferredStudio: 'ANIMATION',
    title: '3 Rahasia Tersembunyi di Balik Karakter Anime Favorit',
    hook3s: '"Kalian sadar gak, kenapa tokoh utama anime shonen selalu punya luka di wajah atau mata kirinya?"',
    concept: 'Animasi visual karakter bergaya Shinkai/Anime yang mengungkap makna simbolis di balik desain pahlawan fiksi.',
    niche: 'Animasi & Pop Culture',
    targetDuration: '45 - 55 Detik',
    retentionTip: 'Gunakan loop ending di detik 50 agar video otomatis terulang saat penonton masih mencerna poin ketiga.',
    aspectRatio: '9:16',
    characterDescription: 'Karakter pendekar anime rambut hitam dengan mata kiri berpendar biru misterius dan luka gores epik di pipi',
    worldSetting: 'Latar kuil Jepang di atas bukit berselimut kelopak bunga sakura dan awan senja magis'
  },
  {
    id: 'sch_2',
    day: 'Hari 2 (Selasa)',
    format: 'SHORTS',
    preferredStudio: 'EDUCATIONAL',
    title: 'Apa yang Terjadi Jika Bumi Berhenti Berputar 1 Detik Saja?',
    hook3s: '"Jika Bumi mendadak berhenti berputar selama 1 detik saja, kecepatan angin 1.600 km/jam akan menyapu seluruh benua!"',
    concept: 'Infografis gerak 2D dan simulasi diagram fisika atmosfer yang dramatis dan mudah dipahami.',
    niche: 'Sains Populer & Edukasi',
    targetDuration: '50 - 58 Detik',
    retentionTip: 'Visual transisi cepat pada detik ke-3 dengan suara whoosh dan efek peta dunia berguncang.',
    aspectRatio: '9:16',
    category: 'Sains & Teknologi (STEM)'
  },
  {
    id: 'sch_3',
    day: 'Hari 3 (Rabu)',
    format: 'LONG_FORM',
    preferredStudio: 'EDUCATIONAL',
    title: 'Panduan Lengkap: Bagaimana AI Mengubah Masa Depan Finansial & Karir',
    hook3s: '"Dalam 3 tahun ke depan, 60% pekerjaan administrasi akan digantikan sistem otonom. Ini cara agar Anda tetap unggul."',
    concept: 'Penjelasan mendalam 3 bab: Evolusi AI, Sektor pekerjaan terdampak, dan 5 keahlian non-AI yang bernilai tinggi.',
    niche: 'Teknologi, Finansial & Karir',
    targetDuration: '6 - 8 Menit',
    retentionTip: 'Bagi video menjadi 3 bab bertahap dengan visual diagram data infografis dinamis.',
    aspectRatio: '16:9',
    category: 'Bisnis, Finansial & Investasi'
  },
  {
    id: 'sch_4',
    day: 'Hari 4 (Kamis)',
    format: 'SHORTS',
    preferredStudio: 'ANIMATION',
    title: 'Kisah 30 Detik: Pertarungan Terakhir Robot Pelindung Hutan',
    hook3s: '"Ketika kota beton mencoba meratakan pohon terakhir di bumi, satu robot tua bangkit melawan."',
    concept: 'Animasi 3D Pixar / Unreal Engine epik dengan karakter robot pelindung dan visual pencahayaan atmosferik.',
    niche: 'Animasi & Cerita Sinematik',
    targetDuration: '40 - 50 Detik',
    retentionTip: 'Visual emosional dengan musik haru dan klimaks dramatis di detik 35.',
    aspectRatio: '9:16',
    characterDescription: 'Robot penjaga tua berlumut hijau dengan mata sensor bulat kuning ramah dan tangan mekanik kokoh',
    worldSetting: 'Hutan lebat magis dengan pohon raksasa kuno di perbatasan kota megastruktur futuristik'
  },
  {
    id: 'sch_5',
    day: 'Hari 5 (Jumat)',
    format: 'SHORTS',
    preferredStudio: 'EDUCATIONAL',
    title: 'Fakta Aneh Otak Manusia yang Jarang Diketahui',
    hook3s: '"Otak kita mengonsumsi 20% energi tubuh padahal beratnya cuma 2% dari total tubuh kita!"',
    concept: 'Explainer visual medis dengan analogi bohlam lampu 20 watt dan infografis neuron bercahaya.',
    niche: 'Kesehatan & Biologi',
    targetDuration: '45 - 50 Detik',
    retentionTip: 'Gunakan pertanyaan interaktif: "Tebak bagian mana yang paling boros energi?" di detik ke-10.',
    aspectRatio: '9:16',
    category: 'Kesehatan & Biologi'
  },
  {
    id: 'sch_6',
    day: 'Hari 6 (Sabtu)',
    format: 'LONG_FORM',
    preferredStudio: 'ANIMATION',
    title: 'Legenda Pendekar Bayangan: Episode 1 - Sumpah di Tebing Naga',
    hook3s: '"Di puncak Gunung Naga, sumpah yang diucapkan 100 tahun lalu kini menuntut balas darah."',
    concept: 'Cerita anime bersambung dengan koreografi pertarungan cepat, dialog tajam, dan worldbuilding fantasi.',
    niche: 'Serial Animasi Sinematik',
    targetDuration: '5 - 7 Menit',
    retentionTip: 'Berikan cliffhanger menggantung di menit terakhir untuk memicu penonton subscribe episode berikutnya.',
    aspectRatio: '16:9',
    characterDescription: 'Pendekar bayangan bertopeng separuh dengan jubah hitam berkibar dan pedang perak bercahaya',
    worldSetting: 'Tebing batu terjal berkabut tebal di bawah sinar bulan purnama merah'
  },
  {
    id: 'sch_7',
    day: 'Hari 7 (Minggu)',
    format: 'SHORTS',
    preferredStudio: 'EDUCATIONAL',
    title: 'Eksperimen Pikiran: Paradoks Kucing Schrödinger Dijelaskan dalam 40 Detik',
    hook3s: '"Bagaimana seekor kucing bisa HIDUP dan MATI sekaligus di dalam kotak yang sama?"',
    concept: 'Whiteboard animation & kartun penjelasan paradoks kuantum dengan visual kotak transparan interaktif.',
    niche: 'Fisika & Sains Populer',
    targetDuration: '40 - 48 Detik',
    retentionTip: 'Gunakan analogi koin dilempar ke udara untuk visualisasi superposisi kuantum.',
    aspectRatio: '9:16',
    category: 'Sains & Teknologi (STEM)'
  }
];

export const ContentCreatorDashboard: React.FC<ContentCreatorDashboardProps> = ({ 
  onClose,
  onOpenAnimationStudio,
  onOpenEducationalStudio
}) => {
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'schedule' | 'growth' | 'chat'>('analytics');
  
  const [user, setUser] = useState<User | null>(null);
  const [channelData, setChannelData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [filterFormat, setFilterFormat] = useState<'ALL' | 'SHORTS' | 'LONG_FORM' | 'ANIMATION' | 'EDUCATIONAL'>('ALL');

  // Studio Selection Modal State for Direct Execution
  const [selectedPlanForExecution, setSelectedPlanForExecution] = useState<ScheduleItem | null>(null);
  const [showStudioChooser, setShowStudioChooser] = useState(false);

  // Chat State
  const [chat, setChat] = useState<Array<{ role: 'ai' | 'user'; msg: string; time: string }>>([
    {
      role: 'ai',
      msg: 'Halo Creator! Saya AI Growth & Monetization Architect Anda. Misi utama saya adalah memandu channel Anda mencapai syarat monetisasi YouTube Partner Program (1.000 Subs & 4.000 Jam Tayang / 10M Shorts Views) serta memaksimalkan retensi audiens melalui produksi video AI berkualitas tinggi. Ada yang ingin kita optimasi hari ini?',
      time: 'Sekarang'
    }
  ]);
  const [input, setInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setIsYoutubeConnected(true);
        fetchYouTubeData(token);
      },
      () => {
        setUser(null);
        setIsYoutubeConnected(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchYouTubeData = async (token: string) => {
    setLoadingStats(true);
    try {
      // Fetch Channel Info
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const channelJson = await channelRes.json();
      if (channelJson.items && channelJson.items.length > 0) {
        setChannelData(channelJson.items[0]);
      }

      // Fetch Analytics (Last 28 days)
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 28);
      
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const endDate = formatDate(end);
      const startDate = formatDate(start);

      const analyticsRes = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?endDate=${endDate}&ids=channel==MINE&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained&startDate=${startDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const analyticsJson = await analyticsRes.json();
      if (analyticsJson.rows && analyticsJson.rows.length > 0) {
        setAnalyticsData({
          views: Number(analyticsJson.rows[0][0]) || 0,
          estimatedMinutesWatched: Number(analyticsJson.rows[0][1]) || 0,
          averageViewDuration: Number(analyticsJson.rows[0][2]) || 0,
          subscribersGained: Number(analyticsJson.rows[0][3]) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching YouTube data:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setIsYoutubeConnected(true);
        fetchYouTubeData(result.accessToken);
      }
    } catch (err) {
      console.error('Login failed', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setIsYoutubeConnected(false);
    setChannelData(null);
    setAnalyticsData(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAiThinking) return;

    const userMsg = input.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChat(prev => [...prev, { role: 'user', msg: userMsg, time: timeStr }]);
    setInput('');
    setIsAiThinking(true);

    try {
      // Call Neurona Chat Service via API
      const res = await fetch('/api/neurona-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid || 'guest_creator',
          message: `Sebagai AI YouTube Growth & Monetization Architect, jawab pertanyaan creator ini secara taktis dan fokus pada retensi audiens, hook 3 detik, algoritma YouTube Shorts / Video Biasa, serta percepatan monetisasi AdSense: "${userMsg}". Berikan saran terstruktur yang dapat dieksekusi ke Studio Animasi atau Studio Edukasi.`,
          history: chat.slice(-4).map(c => ({
            role: c.role === 'ai' ? 'model' : 'user',
            parts: [{ text: c.msg }]
          }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.text || data.response || data.message || 'Strategi telah dirancang. Silakan pilih jadwal konten untuk mengeksekusi produksi video.';
        setChat(prev => [...prev, { role: 'ai', msg: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      } else {
        // Fallback contextual response
        generateFallbackStrategy(userMsg);
      }
    } catch (err) {
      generateFallbackStrategy(userMsg);
    } finally {
      setIsAiThinking(false);
    }
  };

  const generateFallbackStrategy = (query: string) => {
    const q = query.toLowerCase();
    let reply = '';
    if (q.includes('subscriber') || q.includes('1000') || q.includes('subs')) {
      reply = `🎯 **Strategi Tembus 1.000 Subscriber via YouTube Shorts & Animasi/Edukasi:**\n1. **Posting Konsisten**: 1-2 Shorts per hari selama 30 hari pertama menggunakan Studio Animasi atau Edukasi.\n2. **Hook Visual Detik 0-3**: Hindari intro lambat. Langsung ajukan pertanyaan paradoks atau aksi grafis tinggi.\n3. **Call-To-Action Halus di Detik 40**: "Subscribe untuk part 2 besok!" sebelum video loop terulang.\n4. **Kategori High-RPM**: Fokus pada edukasi teknologi, cerita misteri anime, atau sains visual yang memicu share.`;
    } else if (q.includes('jam tayang') || q.includes('4000') || q.includes('watch hour') || q.includes('panjang')) {
      reply = `⏱️ **Strategi Tembus 4.000 Jam Tayang Publik (Video Panjang 16:9):**\n1. **Durasi Ideal**: Buat video 6 - 9 menit menggunakan Studio Edukasi (Motion Graphics 2D) atau Studio Animasi (Anime Story).\n2. **Struktur 3 Bab**: Bab 1 (Masalah & Hook), Bab 2 (Analisa / Petualangan Inti), Bab 3 (Solusi / Ending Epik).\n3. **Retensi di atas 45%**: Gunakan pacing adegan per 4-6 detik dengan transisi visual dinamis agar penonton tidak bosan.\n4. **End Screen Funneling**: Arahkan penonton di akhir video untuk langsung menonton video berikutnya dalam playlist.`;
    } else if (q.includes('monetize') || q.includes('penghasilan') || q.includes('uang') || q.includes('cuan') || q.includes('rpm')) {
      reply = `💰 **Panduan Monetisasi & Sumber Penghasilan YouTube:**\n1. **YouTube Partner Program (AdSense)**: Syarat 1.000 Subs + 4.000 Jam Tayang (Video Panjang) ATAU 10 Juta Penayangan Shorts dalam 90 hari.\n2. **Estimasi RPM**: Video Edukasi Finansial & Tech (Rp 30.000 - Rp 120.000 per 1k views), Animasi & Entertainment (Rp 8.000 - Rp 25.000 per 1k views).\n3. **Monetisasi Tambahan**: Super Thanks / Super Chat pada video populer, Sponsorship brand edukasi/software, serta produk digital.`;
    } else {
      reply = `💡 **Rekomendasi AI Growth Architect untuk "${query}":**\nUntuk memaksimalkan pertumbuhan channel, gunakan perpaduan 70% YouTube Shorts (untuk menarik subscriber baru dengan cepat) dan 30% Video Panjang (untuk mengumpulkan 4.000 jam tayang). Anda dapat langsung mengeksekusi ide konten di tab **"Jadwal Konten Harian"** ke Studio Animasi atau Studio Edukasi!`;
    }
    setChat(prev => [...prev, { role: 'ai', msg: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  };

  const executePlan = (item: ScheduleItem) => {
    setSelectedPlanForExecution(item);
    setShowStudioChooser(true);
  };

  const handleConfirmStudioExecution = (studio: 'ANIMATION' | 'EDUCATIONAL') => {
    if (!selectedPlanForExecution) return;
    setShowStudioChooser(false);
    onClose();

    if (studio === 'ANIMATION') {
      if (onOpenAnimationStudio) {
        onOpenAnimationStudio({
          title: selectedPlanForExecution.title,
          targetGenre: selectedPlanForExecution.format === 'SHORTS' ? 'ACTION' : 'ADVENTURE',
          characterDescription: selectedPlanForExecution.characterDescription || 'Karakter utama visual ekspresif dengan pencahayaan sinematik',
          worldSetting: selectedPlanForExecution.worldSetting || 'Latar dunia dinamis dengan atmosfer visual memukau',
          aspectRatio: selectedPlanForExecution.aspectRatio
        });
      }
    } else {
      if (onOpenEducationalStudio) {
        onOpenEducationalStudio({
          subjectTitle: selectedPlanForExecution.title,
          category: selectedPlanForExecution.category || 'Sains & Teknologi (STEM)',
          aspectRatio: selectedPlanForExecution.aspectRatio,
          keyTakeaways: selectedPlanForExecution.concept,
          characterDescription: 'Profesor Robot AI ramah bernama Dr. Byte dengan visual interaktif'
        });
      }
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Real Metric Calculations for Monetization Tracker
  const rawSubs = Number(channelData?.statistics?.subscriberCount) || 0;
  const rawWatchMinutes = Number(analyticsData?.estimatedMinutesWatched) || 0;
  const rawWatchHours = Math.round((rawWatchMinutes / 60) * 10) / 10;
  const rawViews = Number(analyticsData?.views) || Number(channelData?.statistics?.viewCount) || 0;

  const subsProgress = Math.min(100, Math.round((rawSubs / 1000) * 100));
  const watchHoursProgress = Math.min(100, Math.round((rawWatchHours / 4000) * 100));
  const shortsProgress = Math.min(100, Math.round((rawViews / 10000000) * 100));

  const isMonetized = rawSubs >= 1000 && (rawWatchHours >= 4000 || rawViews >= 10000000);

  const filteredSchedule = DEFAULT_SCHEDULE.filter(item => {
    if (filterFormat === 'ALL') return true;
    if (filterFormat === 'SHORTS') return item.format === 'SHORTS';
    if (filterFormat === 'LONG_FORM') return item.format === 'LONG_FORM';
    if (filterFormat === 'ANIMATION') return item.preferredStudio === 'ANIMATION';
    if (filterFormat === 'EDUCATIONAL') return item.preferredStudio === 'EDUCATIONAL';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-6xl h-[92vh] sm:h-[88vh] bg-[#070b19] border border-pink-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-slate-950/80 shrink-0 gap-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/25 shrink-0">
              <Youtube className="text-white" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">CONTENT CREATOR AGENT</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30 hidden xs:inline-block">
                  AI Growth & Monetize
                </span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Optimasi YouTube Shorts & Video Panjang Menuju Monetisasi AdSense
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isYoutubeConnected ? (
              <div className="flex items-center gap-2 bg-emerald-950/50 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-xs text-emerald-300">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="hidden sm:inline font-medium">{channelData?.snippet?.title || user?.displayName || 'Channel Connected'}</span>
                <span className="sm:hidden font-medium">Connected</span>
                <button 
                  onClick={handleLogout}
                  title="Disconnect Channel" 
                  className="ml-1 text-slate-400 hover:text-red-400 p-0.5 transition"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-red-600/30"
              >
                <Youtube size={14} />
                <span>Hubungkan YouTube</span>
              </button>
            )}

            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar (Responsive on all screen sizes) */}
        <div className="flex items-center border-b border-white/10 bg-slate-900/60 px-2 sm:px-4 overflow-x-auto no-scrollbar shrink-0">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BarChart2 size={15} />
            <span>1. Analitik & Monetisasi YPP</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'schedule'
                ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Calendar size={15} />
            <span>2. Jadwal & Eksekusi Studio AI</span>
            <span className="px-1.5 py-0.2 bg-pink-500 text-white text-[9px] font-bold rounded-full ml-1">
              7 Hari
            </span>
          </button>

          <button
            onClick={() => setActiveTab('growth')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'growth'
                ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Flame size={15} />
            <span>3. Blueprint Retensi & Algoritma</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-3 sm:px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-pink-500 text-pink-400 bg-pink-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <MessageSquare size={15} />
            <span>4. Tanya AI Strategist</span>
          </button>
        </div>

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#040816]">
          
          {/* TAB 1: ANALYTICS & MONETIZATION ROADMAP */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              {/* Real YouTube Connection Status Banner */}
              {!isYoutubeConnected ? (
                <div className="bg-gradient-to-r from-red-950/40 via-purple-950/30 to-slate-900 border border-red-500/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-2 text-center md:text-left">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-semibold">
                      <Youtube size={14} /> Official YouTube Data API v3
                    </div>
                    <h3 className="text-lg font-bold text-white">Hubungkan Channel YouTube Anda</h3>
                    <p className="text-sm text-slate-300 max-w-xl">
                      Login dengan akun Google Anda untuk membaca metrik analitik resmi (Subscribers, Jam Tayang, Views) tanpa data template atau estimasi palsu.
                    </p>
                  </div>
                  <button
                    onClick={handleLogin}
                    className="w-full md:w-auto px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-600/30 shrink-0"
                  >
                    <Youtube size={16} />
                    <span>Login Akun YouTube Sekarang</span>
                  </button>
                </div>
              ) : loadingStats ? (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="animate-spin text-pink-500" size={28} />
                  <p className="text-slate-300 text-sm font-medium">Menghubungi server YouTube API & mengambil analitik real-time...</p>
                </div>
              ) : (
                /* Real Channel Performance Cards */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base sm:text-lg flex items-center gap-2">
                        <span>Statistik Resmi Channel</span>
                        <span className="text-xs text-slate-400 font-normal">(28 Hari Terakhir)</span>
                      </h3>
                      <p className="text-xs text-slate-400">Data live dari YouTube Analytics API</p>
                    </div>
                    <button
                      onClick={() => {
                        const token = getAccessToken();
                        if (token) fetchYouTubeData(token);
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      <RefreshCw size={12} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Subscribers */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between text-slate-400 mb-1.5">
                        <span className="text-xs font-bold uppercase text-slate-400">Total Subs</span>
                        <Users size={15} className="text-pink-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        {formatNumber(rawSubs)}
                      </div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                        <TrendingUp size={11} /> 
                        +{formatNumber(analyticsData?.subscribersGained || 0)} bulan ini
                      </div>
                    </div>

                    {/* Views (28d) */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between text-slate-400 mb-1.5">
                        <span className="text-xs font-bold uppercase text-slate-400">Views 28 Hari</span>
                        <Video size={15} className="text-cyan-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        {formatNumber(rawViews)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Lifetime: {formatNumber(channelData?.statistics?.viewCount || 0)} views
                      </div>
                    </div>

                    {/* Jam Tayang (Watch Hours) */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between text-slate-400 mb-1.5">
                        <span className="text-xs font-bold uppercase text-slate-400">Jam Tayang (28d)</span>
                        <Clock size={15} className="text-purple-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        {rawWatchHours} <span className="text-xs text-slate-400 font-normal">Jam</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Total menit: {formatNumber(rawWatchMinutes)}
                      </div>
                    </div>

                    {/* Average View Duration */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 sm:p-4">
                      <div className="flex items-center justify-between text-slate-400 mb-1.5">
                        <span className="text-xs font-bold uppercase text-slate-400">Rerata Durasi</span>
                        <BarChart2 size={15} className="text-amber-400" />
                      </div>
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        {formatDuration(analyticsData?.averageViewDuration || 0)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Total {channelData?.statistics?.videoCount || 0} video publik
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* YouTube Partner Program (YPP) Monetization Tracker */}
              <div className="bg-slate-900/90 border border-pink-500/20 rounded-2xl p-4 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
                      <Target size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm sm:text-base">Tracker Syarat Monetisasi YouTube Partner Program (YPP)</h4>
                      <p className="text-[11px] text-slate-400">Target kelayakan pendapatan iklan AdSense & program kreator</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    isMonetized 
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40' 
                      : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                  }`}>
                    {isMonetized ? '🎉 Memenuhi Syarat YPP' : '⏳ Sedang Berproses Menuju YPP'}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Syarat 1: Subscribers */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Users size={14} className="text-pink-400" />
                        <span>1.000 Pelanggan (Subscribers)</span>
                      </span>
                      <span className="font-bold text-pink-400">
                        {rawSubs.toLocaleString()} / 1.000 ({subsProgress}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-600 to-rose-400 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(5, subsProgress)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {rawSubs >= 1000 
                        ? '✅ Syarat pelanggan telah terpenuhi!' 
                        : `Kurang ${(1000 - rawSubs).toLocaleString()} subscriber lagi. Genjot posting 1-2 Shorts setiap hari.`}
                    </p>
                  </div>

                  {/* Syarat 2: Watch Hours vs Shorts Views */}
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock size={14} className="text-purple-400" />
                        <span>4.000 Jam Tayang Publik (Video Biasa)</span>
                      </span>
                      <span className="font-bold text-purple-400">
                        {rawWatchHours} / 4.000 Jam ({watchHoursProgress}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.max(5, watchHoursProgress)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Alternatif: 10 Juta Penayangan Shorts (Tercapai: {formatNumber(rawViews)} views)</span>
                    </div>
                  </div>
                </div>

                {/* Monetization Action Checklist */}
                <div className="p-3.5 bg-gradient-to-r from-slate-950 to-pink-950/20 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <DollarSign size={18} />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs sm:text-sm text-white">Alur Produksi Video Otomatis Menuju Monetisasi</h5>
                      <p className="text-[11px] text-slate-400">Pilih ide konten harian di tab Jadwal, lalu klik eksekusi ke Studio Animasi atau Edukasi.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md shrink-0"
                  >
                    <span>Buka Jadwal Konten</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DAILY CONTENT SCHEDULE & STUDIO EXECUTION */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 max-w-5xl mx-auto">
              
              {/* Header & Filter Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border border-slate-800 p-3.5 rounded-xl">
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base flex items-center gap-2">
                    <Calendar size={16} className="text-pink-400" />
                    <span>Jadwal Produksi Konten Harian (7 Hari Kalender)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Rancangan terstruktur dengan hook 3 detik, alur cerita, dan direct dispatch ke Studio AI.
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterFormat('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filterFormat === 'ALL' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setFilterFormat('SHORTS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      filterFormat === 'SHORTS' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Film size={12} /> Shorts (9:16)
                  </button>
                  <button
                    onClick={() => setFilterFormat('LONG_FORM')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      filterFormat === 'LONG_FORM' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Video size={12} /> Video Panjang
                  </button>
                  <button
                    onClick={() => setFilterFormat('ANIMATION')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filterFormat === 'ANIMATION' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    🎨 Animasi
                  </button>
                  <button
                    onClick={() => setFilterFormat('EDUCATIONAL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                      filterFormat === 'EDUCATIONAL' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    📚 Edukasi
                  </button>
                </div>
              </div>

              {/* Schedule Item Cards */}
              <div className="grid grid-cols-1 gap-3.5">
                {filteredSchedule.map((item, idx) => (
                  <div 
                    key={item.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 rounded-xl p-4 transition-all space-y-3"
                  >
                    {/* Top Meta Line */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-800 text-pink-300 border border-pink-500/30">
                          {item.day}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          item.format === 'SHORTS'
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                            : 'bg-indigo-950/80 text-indigo-300 border border-indigo-500/30'
                        }`}>
                          {item.format === 'SHORTS' ? '📱 YouTube Shorts (9:16)' : '🖥️ Video Panjang (16:9)'}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          Niche: <span className="text-slate-200 font-semibold">{item.niche}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {item.targetDuration}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.preferredStudio === 'ANIMATION'
                            ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/30'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {item.preferredStudio === 'ANIMATION' ? '🎨 Rekomendasi: Studio Animasi' : '📚 Rekomendasi: Studio Edukasi'}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-white">{item.title}</h4>

                    {/* Hook 3 Detik Box */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-3 space-y-1">
                      <div className="text-[10px] uppercase font-bold text-pink-400 flex items-center gap-1">
                        <Sparkles size={12} />
                        <span>Naskah Hook 3 Detik Pertama (Pencegah Skip Penonton):</span>
                      </div>
                      <p className="text-xs text-slate-200 italic">
                        {item.hook3s}
                      </p>
                    </div>

                    {/* Concept & Retention Advice */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
                        <span className="font-semibold text-slate-400 block mb-0.5">Alur Materi / Cerita:</span>
                        <p className="text-slate-300">{item.concept}</p>
                      </div>
                      <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60">
                        <span className="font-semibold text-amber-400 block mb-0.5">Tips Retensi Algoritma:</span>
                        <p className="text-slate-300">{item.retentionTip}</p>
                      </div>
                    </div>

                    {/* Action Execution Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400 hidden sm:block">
                        Format: <span className="text-slate-300 font-mono">{item.aspectRatio}</span> • 1-Click transfer ke Studio AI
                      </div>
                      <button
                        onClick={() => executePlan(item)}
                        className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-pink-600/20"
                      >
                        <Play size={13} fill="currentColor" />
                        <span>🎬 Eksekusi Produksi Sekarang</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: ALGORITHM & RETENTION BLUEPRINT */}
          {activeTab === 'growth' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              
              <div className="bg-gradient-to-br from-slate-900 to-pink-950/30 border border-pink-500/20 rounded-2xl p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Flame className="text-pink-400" size={20} />
                    <span>Blueprint Algoritma & Retensi YouTube Menuju Monetisasi</span>
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Strategi teruji untuk mengoptimasi YouTube Shorts (9:16) dan Video Panjang (16:9) agar algoritma merekomendasikan video secara masif.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shorts Formula */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                      <Film size={16} />
                      <span>Formula YouTube Shorts (9:16) - Viral Loop</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">1.</span>
                        <span><strong>Detik 0-3 (The Visual Hook)</strong>: Gerakan cepat / pertanyaan kontroversial tanpa jeda nafas atau intro nama.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">2.</span>
                        <span><strong>Detik 4-40 (Pacing Cepat)</strong>: Ganti sudut pandang / adegan setiap 3-5 detik menggunakan Studio Animasi/Edukasi.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">3.</span>
                        <span><strong>Detik 40-55 (The Seamless Loop)</strong>: Buat kalimat terakhir menyambung ke kalimat pertama tanpa jeda hitam.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-rose-400 font-bold">4.</span>
                        <span><strong>Target Metrik</strong>: View-vs-Swipe &gt; 75%, Average Percentage Viewed &gt; 90%.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Long Form Formula */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                      <Video size={16} />
                      <span>Formula Video Panjang (16:9) - Watch Time Engine</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">1.</span>
                        <span><strong>Thumbnail & Judul High CTR</strong>: Judul 45-60 karakter dengan emosi kuat (Kuriositas, Harapan, atau Bahaya).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">2.</span>
                        <span><strong>Struktur 3 Bab</strong>: Susun alur jelas: Pengenalan Masalah &rarr; Petualangan / Studi Kasus &rarr; Konklusi Epik.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">3.</span>
                        <span><strong>Durasi Ideal</strong>: 6 - 10 menit agar memenuhi syarat mid-roll ads setelah monetisasi aktif.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-indigo-400 font-bold">4.</span>
                        <span><strong>Target Metrik</strong>: CTR Thumbnail &gt; 6%, Audience Retention &gt; 45% di menit ke-3.</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* High RPM Niche Guidance */}
                <div className="bg-slate-950/60 border border-emerald-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase">
                    <DollarSign size={14} />
                    <span>Niche dengan Nilai RPM / Cuan AdSense Tertinggi di YouTube:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="font-bold text-emerald-300 block">1. Sains, AI & Tech</span>
                      <span className="text-[11px] text-slate-400">Cocok di Studio Edukasi (Motion Graphics 2D)</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="font-bold text-emerald-300 block">2. Bisnis & Keuangan</span>
                      <span className="text-[11px] text-slate-400">Cocok di Studio Edukasi (Isometric 3D)</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="font-bold text-emerald-300 block">3. Cerita Anime & Sinematik</span>
                      <span className="text-[11px] text-slate-400">Cocok di Studio Animasi (Anime Shinkai / 3D)</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: INTERACTIVE AI STRATEGIST CHAT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full max-w-4xl mx-auto space-y-3">
              
              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  onClick={() => setInput('Bagaimana cara membuat naskah YouTube Shorts dengan retensi 80%?')}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition"
                >
                  ⚡ Naskah Shorts Retensi 80%
                </button>
                <button
                  onClick={() => setInput('Buatkan rencana 30 hari untuk tembus 1.000 subscriber pertama')}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition"
                >
                  🎯 Roadmap 1.000 Subs
                </button>
                <button
                  onClick={() => setInput('Bagaimana strategi mengumpulkan 4.000 jam tayang video panjang?')}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition"
                >
                  ⏱️ 4.000 Jam Tayang
                </button>
                <button
                  onClick={() => setInput('Ide video edukasi sains dengan potensi RPM tertinggi')}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition"
                >
                  💰 Ide Niche High RPM
                </button>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 min-h-[300px]">
                {chat.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`flex gap-3 max-w-[88%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${
                      msg.role === 'ai' 
                        ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white shadow-md' 
                        : 'bg-slate-700 text-slate-200'
                    }`}>
                      {msg.role === 'ai' ? <Zap size={14} /> : <span className="text-xs font-bold">U</span>}
                    </div>
                    <div className="space-y-1">
                      <div className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                        msg.role === 'ai' 
                          ? 'bg-slate-900 border border-slate-800 text-slate-200' 
                          : 'bg-gradient-to-r from-pink-600 to-rose-600 text-white font-medium'
                      }`}>
                        {msg.msg}
                      </div>
                      <span className="text-[10px] text-slate-500 px-1">{msg.time}</span>
                    </div>
                  </div>
                ))}

                {isAiThinking && (
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white shrink-0">
                      <Zap size={14} />
                    </div>
                    <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 flex items-center gap-2">
                      <RefreshCw size={13} className="animate-spin text-pink-400" />
                      <span>AI Growth Architect sedang menganalisa strategi terbaik...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Box */}
              <form onSubmit={handleSend} className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Tanyakan ide konten, formula hook, atau optimasi algoritma YouTube..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-4 pr-12 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500 transition"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim() || isAiThinking}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-40 rounded-lg text-white transition shadow-md"
                >
                  <Zap size={15} />
                </button>
              </form>

            </div>
          )}

        </div>

      </div>

      {/* STUDIO SELECTION POPUP MODAL FOR DIRECT EXECUTION */}
      {showStudioChooser && selectedPlanForExecution && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#0b1021] border border-pink-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play className="text-pink-400" size={18} />
                <h3 className="font-bold text-white text-base">Pilih Studio Produksi AI</h3>
              </div>
              <button 
                onClick={() => setShowStudioChooser(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">Konten yang akan dieksekusi:</div>
              <div className="text-sm font-bold text-white bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                {selectedPlanForExecution.title}
              </div>
              <div className="text-[11px] text-pink-300 font-medium pt-1">
                Format: {selectedPlanForExecution.format === 'SHORTS' ? '📱 YouTube Shorts (9:16)' : '🖥️ Video Panjang (16:9)'}
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Pilih studio AI yang paling sesuai dengan gaya visual konten ini:
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Animation Studio */}
              <button
                onClick={() => handleConfirmStudioExecution('ANIMATION')}
                className="w-full text-left p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-900/30 hover:border-cyan-400 transition flex items-start gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 group-hover:scale-105 transition">
                  <Film size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>Studio Animasi</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-cyan-500/30 rounded text-cyan-200">Anime / 3D / Manga</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cocok untuk visual cerita, karakter berkarisma, ekspresi emosional, dan serial pendek fiksi.
                  </p>
                </div>
              </button>

              {/* Option 2: Educational Studio */}
              <button
                onClick={() => handleConfirmStudioExecution('EDUCATIONAL')}
                className="w-full text-left p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-900/30 hover:border-emerald-400 transition flex items-start gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shrink-0 group-hover:scale-105 transition">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>Studio Edukasi</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/30 rounded text-emerald-200">Explainer / Infografis</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cocok untuk visual sains, fakta menarik, diagram teknologi, dan pembahasan materi berbobot.
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowStudioChooser(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
