import React, { useState, useEffect } from 'react';
import { X, Youtube, BarChart2, MessageSquare, Zap, TrendingUp, Users, Video, LogOut } from 'lucide-react';
import { googleSignIn, initAuth, getAccessToken, logout } from '../utils/googleAuth';
import type { User } from 'firebase/auth';

interface ContentCreatorDashboardProps {
  onClose: () => void;
}

export const ContentCreatorDashboard: React.FC<ContentCreatorDashboardProps> = ({ onClose }) => {
  const [isYoutubeConnected, setIsYoutubeConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'planner'>('analytics');
  
  const [user, setUser] = useState<User | null>(null);
  const [channelData, setChannelData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  
  const [chat, setChat] = useState([
    { role: 'ai', msg: 'Halo! Saya AI Content Architect Anda. Saya telah menganalisa performa channel Anda. Konten dengan hook 3 detik pertama berfokus pada "Problem Solving" memiliki retensi 45% lebih tinggi.' }
  ]);
  const [input, setInput] = useState('');

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
          views: analyticsJson.rows[0][0],
          estimatedMinutesWatched: analyticsJson.rows[0][1],
          averageViewDuration: analyticsJson.rows[0][2],
          subscribersGained: analyticsJson.rows[0][3],
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

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setChat(prev => [...prev, { role: 'user', msg: input }]);
    const currentInput = input;
    setInput('');
    
    // Simulate AI response based on analytics context
    setTimeout(() => {
      let contextMsg = "";
      if (analyticsData) {
        contextMsg = `Melihat dari ${analyticsData.views || 0} views Anda di 28 hari terakhir, `;
      }
      setChat(prev => [...prev, { role: 'ai', msg: `${contextMsg}Saya merekomendasikan format Listicle untuk topik "${currentInput}" agar watch time optimal.`}]);
    }, 1500);
  }

  const formatNumber = (num: number) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl h-[85vh] bg-[#0b1021] rounded-2xl shadow-2xl border border-pink-500/30 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Youtube className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">CONTENT CREATOR (AI Architect)</h2>
              <div className="text-pink-400 text-[10px] font-medium mt-0.5">
                Workspace Analisa & Perencanaan Konten
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-white/10 bg-slate-950/50 flex flex-col">
            <div className="p-4 border-b border-white/10">
              {!isYoutubeConnected ? (
                <button 
                  onClick={handleLogin}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-red-500/20"
                >
                  <Youtube size={14} />
                  Login YouTube Channel
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={channelData?.snippet?.thumbnails?.default?.url || user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=random`} 
                      alt="Channel" 
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full border border-white/10" 
                    />
                    <div className="overflow-hidden">
                      <div className="text-white font-bold text-sm truncate">{channelData?.snippet?.title || user?.displayName || 'My Channel'}</div>
                      <div className="text-emerald-400 text-[10px] flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Connected
                      </div>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] rounded transition">
                    <LogOut size={12} /> Disconnect
                  </button>
                </div>
              )}
            </div>
            
            <div className="p-2 space-y-1">
              <button 
                onClick={() => setActiveTab('analytics')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'analytics' ? 'bg-pink-500/20 text-pink-300' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <BarChart2 size={14} /> Performance Analytics
              </button>
              <button 
                onClick={() => setActiveTab('planner')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition ${activeTab === 'planner' ? 'bg-pink-500/20 text-pink-300' : 'text-slate-400 hover:bg-white/5'}`}
              >
                <MessageSquare size={14} /> AI Content Planner
              </button>
            </div>
          </div>

          {/* Main Area */}
          <div className="flex-1 flex flex-col bg-[#050814] overflow-hidden">
            {activeTab === 'analytics' && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!isYoutubeConnected ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                      <Youtube className="text-slate-500" size={32} />
                    </div>
                    <div>
                      <h3 className="text-slate-300 font-bold mb-1">Hubungkan Channel YouTube</h3>
                      <p className="text-slate-500 text-sm max-w-md">
                        Login dengan akun Google Anda untuk membaca metrics, menganalisa retensi, dan merencanakan konten secara otomatis.
                      </p>
                    </div>
                  </div>
                ) : loadingStats ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-4">
                    <div className="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full" />
                    <p className="text-slate-400 text-sm">Menarik data analitik YouTube...</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-white font-bold text-lg">Channel Overview (Last 28 Days)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Subscribers */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <Users size={14} /> <span className="text-xs font-bold uppercase">Subscribers</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatNumber(channelData?.statistics?.subscriberCount || 0)}
                        </div>
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                          <TrendingUp size={10} /> 
                          {analyticsData?.subscribersGained > 0 ? '+' : ''}{analyticsData?.subscribersGained || 0} this month
                        </div>
                      </div>
                      
                      {/* Views */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <Video size={14} /> <span className="text-xs font-bold uppercase">Views (28d)</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatNumber(analyticsData?.views || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                          Total: {formatNumber(channelData?.statistics?.viewCount || 0)}
                        </div>
                      </div>
                      
                      {/* Avg View Duration */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <BarChart2 size={14} /> <span className="text-xs font-bold uppercase">Avg View Duration</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatDuration(analyticsData?.averageViewDuration || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Menit:detik per penayangan</div>
                      </div>

                      {/* Total Videos */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-slate-400 mb-2">
                          <Youtube size={14} /> <span className="text-xs font-bold uppercase">Videos</span>
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatNumber(channelData?.statistics?.videoCount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">Total publikasi video</div>
                      </div>

                    </div>
                    
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center h-48">
                      <BarChart2 size={32} className="text-slate-600 mb-2" />
                      <p className="text-slate-500 text-sm">Visualisasi grafik analitik yang lebih detil dapat ditambahkan di sini.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'planner' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chat.map((c, i) => (
                    <div key={i} className={`flex gap-3 max-w-[80%] ${c.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${c.role === 'ai' ? 'bg-pink-600' : 'bg-slate-700'}`}>
                        {c.role === 'ai' ? <Zap size={14} className="text-white" /> : <span className="text-xs font-bold text-white">U</span>}
                      </div>
                      <div className={`p-3 rounded-xl text-sm ${c.role === 'ai' ? 'bg-slate-800 text-slate-200' : 'bg-pink-600/20 text-pink-100 border border-pink-500/30'}`}>
                        {c.msg}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-white/10 bg-slate-950/50">
                  <form onSubmit={handleSend} className="relative">
                    <input 
                      type="text" 
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      placeholder="Minta AI untuk buatkan script, ide, atau analisa metrik..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500 transition"
                    />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-pink-600 hover:bg-pink-500 rounded-lg text-white transition">
                      <Zap size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
