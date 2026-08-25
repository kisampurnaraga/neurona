import React, { useState } from 'react';
import { BookOpen, X, GraduationCap, Layers, Globe, Lightbulb, Users, Video, Volume2, Check, UserCheck, MapPin, Sparkles } from 'lucide-react';
import { EducationalConfig } from '../shared/types';
import { neuronaVoice } from '../utils/speechSynthesis';

interface EducationalConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (config: EducationalConfig, prompt: string) => void;
}

const VISUAL_STYLES: { id: EducationalConfig['visualStyle']; title: string; desc: string; icon: string; tag: string }[] = [
  { id: 'MOTION_GRAPHICS_2D', title: 'Motion Graphics 2D', desc: 'Animasi vektor modern, infografis bergerak dinamis & ikon bersih.', icon: '📊', tag: 'Vector 2D' },
  { id: 'WHITEBOARD_ANIMATION', title: 'Whiteboard Animation', desc: 'Tangan menggambar konsep & diagram di papan tulis putih.', icon: '📝', tag: 'Hand Drawn' },
  { id: 'ISOMETRIC_3D', title: 'Isometric 3D Explainer', desc: 'Diorama miniatur 3D teknis dengan visualisasi sistem terurai.', icon: '📐', tag: '3D Diagram' },
  { id: 'SCIENCE_BLUEPRINT', title: 'Science Blueprint / Schematic', desc: 'Gaya cetak biru ilmiah futuristik dengan garis grid presisi.', icon: '🔬', tag: 'Blueprint' },
  { id: 'DOCUMENTARY_INFOGRAPHIC', title: 'Dokumenter & Infografis', desc: 'Kombinasi data statistik, visual arsip, dan grafis informatif.', icon: '📰', tag: 'Infografis' }
];

const AUDIENCES: { id: EducationalConfig['targetAudience']; label: string; desc: string; emoji: string }[] = [
  { id: 'KIDS', label: 'Anak-Anak (PAUD / SD)', desc: 'Bahasa ceria, visual menyenangkan, konsep ramah anak', emoji: '🧒' },
  { id: 'STUDENTS', label: 'Pelajar (SMP / SMA)', desc: 'Struktur kurikulum jelas, rumus, dan penjelasan lugas', emoji: '🎒' },
  { id: 'PROFESSIONALS', label: 'Mahasiswa / Profesional', desc: 'Materi mendalam, terminologi teknis, dan studi kasus', emoji: '🎓' },
  { id: 'GENERAL_ELI5', label: 'Umum (ELI5 - Explain Like I\'m 5)', desc: 'Analogi sehari-hari sederhana untuk siapa saja', emoji: '💡' }
];

const CATEGORIES = [
  'Sains & Teknologi (STEM)',
  'Bisnis, Finansial & Investasi',
  'Kesehatan & Biologi',
  'Sejarah & Sosial Budaya',
  'Pemrograman & AI',
  'Psikologi & Self-Improvement',
  'Fisika & Astronomi'
];

const LANGUAGES = [
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩', label: 'Indonesian' },
  { code: 'en', name: 'English (Academic)', flag: '🇬🇧', label: 'English' },
  { code: 'id-en-bilingual', name: 'Bilingual (ID + EN Sub)', flag: '🌐', label: 'Bilingual' },
  { code: 'ar', name: 'Arabic (العربية)', flag: '🇸🇦', label: 'Arabic' },
  { code: 'es', name: 'Spanish (Español)', flag: '🇪🇸', label: 'Spanish' }
];

const NARRATOR_TONES: { id: EducationalConfig['narratorTone']; label: string; desc: string }[] = [
  { id: 'FRIENDLY_EXPLAINER', label: 'Pengajar Ramah & Interaktif', desc: 'Gaya edukator YouTube edukatif yang santai' },
  { id: 'ENERGETIC_TEACHER', label: 'Guru Bersemangat & Ceria', desc: 'Penuh antusiasme menjaga atensi murid' },
  { id: 'CALM_PROFESSOR', label: 'Dosen Tenang & Berwibawa', desc: 'Artikulasi akademis jelas dan terpercaya' },
  { id: 'DOCUMENTARY_NARRATOR', label: 'Narator Dokumenter Kelas Dunia', desc: 'Nada mendalam seperti National Geographic' }
];

const CHARACTER_PRESETS = [
  { label: '🤖 Profesor Robot AI (Futuristik)', desc: 'Profesor Robot AI ramah bernama Dr. Byte, bodi putih mengkilap dengan aksen neon biru, layar ekspresi mata bersahabat' },
  { label: '👩‍🏫 Guru Sains Wanita (Jas Lab)', desc: 'Edukator sains wanita muda bernama Sarah, mengenakan jas lab putih rapi, kacamata bulat pintar, ekspresi interaktif' },
  { label: '👨‍🏫 Dosen Pria Ahli (Smart Casual)', desc: 'Dosen muda berkharisma bernama Aris, kemeja rapi dengan jam tangan pintar, gestur artikulatif terpercaya' },
  { label: '🦊 Maskot Karakter 3D (Ceria)', desc: 'Maskot 3D rubah berjas detektif kecil bernama Fiko, memegang kaca pembesar, visual ramah dan penuh rasa ingin tahu' },
  { label: '📊 Tanpa Karakter (Fokus Diagram)', desc: 'Visual murni diagram infografis animasi, model interaktif, dan teks penjelasan dinamis tanpa presenter manusia' }
];

const WORLD_PRESETS = [
  { label: '🔬 Laboratorium Sains Modern', desc: 'Laboratorium riset canggih serba putih dengan layar holografis melayang dan peralatan presisi' },
  { label: '🌌 Ruang Angkasa & Galaksi', desc: 'Latar kosmis pemandangan bintang, nebula bercahaya, dan orbit planet futuristik' },
  { label: '💻 Studio Infografis Digital', desc: 'Studio presentasi minimalis berlatar gradasi gelap elegan dengan diagram data bercahaya neon' },
  { label: '🏫 Ruang Kelas Digital Interaktif', desc: 'Ruang kelas masa depan dengan smartboard interaktif dan tata pencahayaan terang' },
  { label: '🌿 Alam & Lingkungan Terbuka', desc: 'Lanskap alam hijau cerah dengan langit biru berawan dan pencahayaan matahari alami' }
];

export const EducationalConfigModal: React.FC<EducationalConfigModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [subjectTitle, setSubjectTitle] = useState('Bagaimana Komputer Kuantum Bekerja?');
  const [category, setCategory] = useState('Sains & Teknologi (STEM)');
  const [targetAudience, setTargetAudience] = useState<EducationalConfig['targetAudience']>('GENERAL_ELI5');
  const [visualStyle, setVisualStyle] = useState<EducationalConfig['visualStyle']>('MOTION_GRAPHICS_2D');
  const [characterDescription, setCharacterDescription] = useState('Profesor Robot AI ramah bernama Dr. Byte, bodi putih mengkilap dengan aksen neon biru, layar ekspresi bersahabat');
  const [worldSetting, setWorldSetting] = useState('Laboratorium riset canggih serba putih dengan layar holografis melayang dan diagram data kuantum');
  const [language, setLanguage] = useState('id');
  const [keyTakeaways, setKeyTakeaways] = useState('Memahami perbedaan bit vs qubit, konsep superposisi dengan analogi koin berputar, dan potensi masa depan AI');
  const [chapterCount, setChapterCount] = useState(3);
  const [sceneCount, setSceneCount] = useState(4);
  const [narratorTone, setNarratorTone] = useState<EducationalConfig['narratorTone']>('FRIENDLY_EXPLAINER');
  const [aspectRatio, setAspectRatio] = useState<EducationalConfig['aspectRatio']>('16:9');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config: EducationalConfig = {
      subjectTitle,
      category,
      targetAudience,
      visualStyle,
      language,
      keyTakeaways,
      chapterCount,
      narratorTone,
      aspectRatio,
      characterDescription,
      worldSetting,
      sceneCount
    };

    const prompt = `Buatkan video pembelajaran edukatif ${visualStyle.replace(/_/g, ' ')} tentang "${subjectTitle}" untuk audiens ${targetAudience} kategori ${category}. Karakter presenter/maskot: ${characterDescription}. Latar visual: ${worldSetting}. Poin inti: ${keyTakeaways}. Bahasa: ${language}.`;
    onSubmit(config, prompt);
    onClose();
  };

  return (
    <div id="educational-config-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div id="educational-config-modal-container" className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/60 overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                Studio Video Pembelajaran & Edukasi
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  Pedagogy Engine
                </span>
              </h2>
              <p className="text-xs text-slate-400">Rancang video materi terstruktur, analogi visual, infografis, dan multi-bahasa</p>
            </div>
          </div>
          <button
            id="btn-close-edu-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[78vh] overflow-y-auto text-slate-200">
          
          {/* Topik & Kategori */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Topik / Judul Materi Pembelajaran
              </label>
              <input
                id="input-edu-subject"
                type="text"
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                placeholder="Contoh: Mengapa Langit Berwarna Biru? / Anatomi Sistem Saraf"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Kategori Materi
              </label>
              <select
                id="select-edu-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Audiens */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Target Audiens & Level Kedalaman Materi
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {AUDIENCES.map((aud) => (
                <button
                  key={aud.id}
                  id={`aud-btn-${aud.id}`}
                  type="button"
                  onClick={() => setTargetAudience(aud.id)}
                  className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                    targetAudience === aud.id
                      ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400 shadow-md shadow-emerald-950'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xl mb-1">{aud.emoji}</div>
                    <div className="text-xs font-semibold text-white mb-0.5">{aud.label}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{aud.desc}</p>
                  </div>
                  {targetAudience === aud.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* JUMLAH ADEGAN (SCENE) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5" />
              JUMLAH ADEGAN (SCENE)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { count: 4, label: '4 Scene (Singkat)' },
                { count: 6, label: '6 Scene (Standar) ⭐' },
                { count: 8, label: '8 Scene (Lengkap)' },
                { count: 10, label: '10 Scene (Maksimal)' }
              ].map((opt) => (
                <button
                  key={opt.count}
                  type="button"
                  onClick={() => setSceneCount(opt.count)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    sceneCount === opt.count 
                      ? 'bg-emerald-600/30 border-emerald-500 text-white font-bold ring-1 ring-emerald-400' 
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-emerald-400/80 mt-1.5 ml-1">
              💡 Estimasi Biaya Render Video: {sceneCount} Scene x 8 Kredit = <strong>{sceneCount * 8} Kredit</strong>
            </div>
          </div>

          {/* Pilihan Gaya Visual Edukasi */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Gaya Visual Eksplanasi (Visual Diagram & Explainer)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.id}
                  id={`edu-style-btn-${style.id}`}
                  type="button"
                  onClick={() => setVisualStyle(style.id)}
                  className={`p-3 rounded-xl text-left border transition relative flex flex-col justify-between ${
                    visualStyle === style.id
                      ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400 shadow-md shadow-emerald-950'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">{style.icon}</span>
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-300">
                        {style.tag}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white leading-tight mb-1">
                      {style.title}
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-2">
                      {style.desc}
                    </p>
                  </div>
                  {visualStyle === style.id && (
                    <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Karakter Edukator / Maskot Konsisten */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                Karakter Pengajar / Maskot Konsisten (Presenter Locking)
              </label>
              <span className="text-[10px] text-emerald-300 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                Face & Identity Lock
              </span>
            </div>
            <textarea
              id="input-edu-character"
              rows={2}
              value={characterDescription}
              onChange={(e) => setCharacterDescription(e.target.value)}
              placeholder="Deskripsikan karakter presenter/maskot (nama, gender, busana, ekspresi, dll)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none resize-none"
            />
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Pilihan Preset Karakter Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {CHARACTER_PRESETS.map((cp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCharacterDescription(cp.desc)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                      characterDescription === cp.desc
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {cp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Latar Belakang & Ruang Visual Pembelajaran */}
          <div className="p-4 rounded-xl bg-slate-950/90 border border-teal-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Latar Belakang / Setting Ruang Visual (World Setting)
              </label>
              <span className="text-[10px] text-teal-300 font-mono bg-teal-950 px-2 py-0.5 rounded border border-teal-500/30">
                Environment Lock
              </span>
            </div>
            <textarea
              id="input-edu-world"
              rows={2}
              value={worldSetting}
              onChange={(e) => setWorldSetting(e.target.value)}
              placeholder="Deskripsikan ruang visual/latar (laboratorium, ruang angkasa, studio infografis, dll)..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 focus:border-teal-500 text-xs text-white placeholder-slate-500 outline-none resize-none"
            />
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-medium">Pilihan Preset Latar Cepat:</span>
              <div className="flex flex-wrap gap-1.5">
                {WORLD_PRESETS.map((wp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setWorldSetting(wp.desc)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                      worldSetting === wp.desc
                        ? 'bg-teal-950 border-teal-400 text-teal-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {wp.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bahasa & Nada Suara */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Bahasa Narasi Pengajar
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    id={`edu-lang-btn-${lang.code}`}
                    type="button"
                    onClick={() => setLanguage(lang.code)}
                    className={`p-2.5 rounded-xl text-xs font-medium border flex items-center gap-2 transition ${
                      language === lang.code
                        ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-base">{lang.flag}</span>
                    <span className="truncate text-[11px]">{lang.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                Karakter Suara Pengajar (Voice Tone)
              </label>
              <select
                id="select-edu-voicetone"
                value={narratorTone}
                onChange={(e) => setNarratorTone(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white outline-none"
              >
                {NARRATOR_TONES.map((nt) => (
                  <option key={nt.id} value={nt.id}>{nt.label} - {nt.desc}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Poin Kunci & Bab */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              Poin Kunci / Inti Pembelajaran (Learning Objectives)
            </label>
            <textarea
              id="input-edu-takeaways"
              rows={2}
              value={keyTakeaways}
              onChange={(e) => setKeyTakeaways(e.target.value)}
              placeholder="Konsep apa saja yang harus dipahami penonton setelah menonton video ini..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 focus:border-emerald-500 text-xs text-white placeholder-slate-500 outline-none resize-none"
            />
          </div>

          {/* Mesin Video AI & Pengisi Suara Edukasi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                Mesin Generator Visual Edukasi
              </label>
              <select
                id="select-edu-video-engine"
                defaultValue={localStorage.getItem('neurona_video_model') || 'byteplus'}
                onChange={(e) => localStorage.setItem('neurona_video_model', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 text-xs text-white outline-none"
              >
                <option value="byteplus">BytePlus ModelArk (PixelDance/Doubao - Baru & Rekomendasi)</option>
                <option value="veo">Google Veo 3.1 (Rekomendasi Utama & API Ready)</option>
                <option value="runway">Runway Gen-3 Alpha (Fallback Tier 1 & API Ready)</option>
                <option value="sora" disabled>OpenAI Sora Turbo (Disabled - No Public API)</option>
                <option value="luma" disabled>Luma Dream Machine (Perlu API Key)</option>
                <option value="kling" disabled>Kling AI 1.5 HD (Perlu API Key)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-rose-400 mb-2 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5" />
                Karakter Suara Edukator (TTS)
              </label>
              <select
                id="select-edu-voice-actor"
                defaultValue={localStorage.getItem('neurona_voice_id') || 'openai-female-nova'}
                onChange={(e) => {
                  localStorage.setItem('neurona_voice_id', e.target.value);
                  neuronaVoice.setVoice(e.target.value);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-rose-400 text-xs text-white outline-none"
              >
                <option value="id-ID-Journey-O">Google Cloud Journey-O (ID ♀ Edukator Ultra-Realistis)</option>
                <option value="id-ID-Wavenet-A">Google Cloud Wavenet-A (ID ♀ Pengajar Jernih & Formal)</option>
                <option value="id-ID-Wavenet-B">Google Cloud Wavenet-B (ID ♂ Guru Bertenaga & Lugas)</option>
                <option value="en-US-Journey-D">Google Cloud Journey-D (EN ♂ Narator Dokumenter Sains)</option>
                <option value="ja-JP-Neural2-B">Google Cloud Neural2-B (JA ♀ Seiyuu Edukasi Jepang)</option>
                <option value="openai-female-nova">ChatGPT Nova (OpenAI - ♀ Edukator Ramah & Jelas)</option>
                <option value="openai-male-onyx">ChatGPT Onyx (OpenAI - ♂ Pengajar Berwibawa & Podcast)</option>
                <option value="openai-female-shimmer">ChatGPT Shimmer (OpenAI - ♀ Lembut & Inspiratif)</option>
                <option value="tryaudio-female-citra">Citra Kirana (Neural AI - ♀ Edukator Ramah & Jelas)</option>
                <option value="tryaudio-male-dimas">Dimas Perkasa (Neural AI - ♂ Pengajar Berwibawa)</option>
                <option value="eleven-male-adam">Adam Explainer (ElevenLabs - ♂ Dosen Ahli & Mendalam)</option>
                <option value="eleven-female-rachel">Rachel Teacher (ElevenLabs - ♀ Guru Interaktif)</option>
              </select>
            </div>
          </div>

          {/* Rasio & Jumlah Bab */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2">
                Jumlah Bab / Adegan Video
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { count: 3, label: '3 Bab (Hook, Konsep, Contoh)' },
                  { count: 4, label: '4 Bab (Hook, Konsep, Contoh, Ringkasan)' }
                ].map((c) => (
                  <button
                    key={c.count}
                    id={`chapter-count-${c.count}`}
                    type="button"
                    onClick={() => setChapterCount(c.count)}
                    className={`py-2 px-2 text-[11px] font-medium rounded-xl border text-center transition ${
                      chapterCount === c.count
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                Format Rasio Video
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '16:9', label: '16:9 (YouTube / Presentasi)' },
                  { id: '9:16', label: '9:16 (Shorts / Reels)' },
                  { id: '1:1', label: '1:1 (Square)' }
                ].map((ratio) => (
                  <button
                    key={ratio.id}
                    id={`edu-ratio-btn-${ratio.id.replace(':', '-')}`}
                    type="button"
                    onClick={() => setAspectRatio(ratio.id as any)}
                    className={`py-2 px-2 text-[11px] font-medium rounded-xl border text-center transition ${
                      aspectRatio === ratio.id
                        ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {ratio.id}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              id="btn-cancel-edu"
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Batal
            </button>
            <button
              id="btn-generate-edu"
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition"
            >
              <GraduationCap className="w-4 h-4" />
              Mulai Produksi Video Edukasi
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
