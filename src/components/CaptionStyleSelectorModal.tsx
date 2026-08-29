import React, { useState } from 'react';
import { Type, Sparkles, LayoutTemplate, Play, CheckCircle2, X } from 'lucide-react';

interface CaptionStyleSelectorModalProps {
  onSelect: (style: string) => void;
  onCancel?: () => void;
}

export const CaptionStyleSelectorModal: React.FC<CaptionStyleSelectorModalProps> = ({ onSelect, onCancel }) => {
  const [selectedStyle, setSelectedStyle] = useState<string>('Bold Pop');

  const styles = [
    { id: 'Bold Pop', name: 'Bold Pop', desc: 'Teks tebal bergaya TikTok dengan warna kuning mencolok.', icon: Sparkles },
    { id: 'Clean Minimal', name: 'Clean Minimal', desc: 'Sederhana dan elegan, font ramping dengan latar semi-transparan.', icon: LayoutTemplate },
    { id: 'Neon Glow', name: 'Neon Glow', desc: 'Teks bercahaya neon ala Cyberpunk, cocok untuk visual gelap.', icon: Type }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 relative">
        {onCancel && (
          <button onClick={onCancel} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition">
            <X size={20} />
          </button>
        )}
        
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Type size={20} className="text-amber-400" /> Pilih Gaya Subtitle
        </h3>
        <p className="text-slate-400 text-sm mb-6 pr-6">
          Sebelum memulai proses rendering video, silakan pilih gaya subtitle (caption) animasi yang ingin Anda gunakan.
        </p>

        <div className="space-y-3 mb-6">
          {styles.map(s => {
            const isSelected = selectedStyle === s.id;
            const Icon = s.icon;
            return (
              <div 
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected 
                    ? 'border-amber-400 bg-amber-950/20' 
                    : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-400'}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1">
                  <h4 className={`font-bold text-sm ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                    {s.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">{s.desc}</p>
                </div>
                {isSelected && <CheckCircle2 size={18} className="text-amber-400 mt-1" />}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            if (selectedStyle) onSelect(selectedStyle);
          }}
          disabled={!selectedStyle}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-indigo-500 hover:from-amber-300 hover:to-indigo-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <Play size={16} fill="currentColor" />
          <span>Mulai Render Video</span>
        </button>
      </div>
    </div>
  );
};
