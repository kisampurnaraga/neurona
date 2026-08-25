#!/bin/bash
# Using ed to replace lines 267 to 392 in LandingPage.tsx
cat << 'ED_CMD' | ed src/components/LandingPage.tsx
267,392c
      {/* HERO SECTION */}
      <section className="relative z-10 pt-20 pb-24 px-6 max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Floating Badge */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-fuchsia-950/40 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-mono uppercase mb-6 shadow-[0_0_20px_rgba(217,70,239,0.15)]"
        >
          <Sparkles size={13} className="text-fuchsia-400 animate-pulse" />
          <span>Unlock Your Creative Potential</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
        >
          Cara Tercepat & Termudah<br/>Bikin <span className="bg-gradient-to-r from-fuchsia-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Video Pendek</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-gray-400 max-w-2xl mb-10 leading-relaxed font-normal mx-auto"
        >
          Generate puluhan video pendek otomatis dalam satu klik dengan caption cerdas, efek transisi, latar belakang, dan musik pengiring dari AI Master Director Gatotkaca.
        </motion.p>

        {/* CTA Group */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button
            type="button"
            onClick={handleRegisterAction}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-[0_0_30px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] transition-all cursor-pointer"
          >
            <span>Mulai Trial / Akses Rp 150rb</span>
            <ArrowRight size={16} className="ml-2" />
          </button>
        </motion.div>
           
        {/* Dashboard Mockup (Glassmorphism) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="w-full max-w-4xl relative mb-16 mx-auto"
        >
          {/* Outer glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-transparent blur-3xl -z-10 rounded-3xl" />
          
          <div className="rounded-3xl border border-white/10 bg-[#0A0A14]/80 backdrop-blur-xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row gap-4 relative overflow-hidden text-left">
            {/* Left Col - Prompter Input */}
            <div className="flex-1 flex flex-col gap-4 border border-white/5 bg-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-purple-400" />
                <span className="text-sm font-bold text-white">Turn your Text into Video</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Select video type</label>
                <div className="px-4 py-3 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-300 flex justify-between items-center cursor-pointer">
                  <span>Affiliate / Edukasi</span>
                  <ChevronDown size={14} />
                </div>
              </div>

              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-xs text-gray-400">Write your prompt in your language</label>
                <div className="flex-1 p-4 bg-black/40 border border-white/5 rounded-xl text-xs text-gray-400 flex flex-col min-h-[140px] leading-relaxed">
                  <span>Buatkan video edukasi cinematic tentang masa depan AI, gunakan karakter robot dengan tone dark dan voiceover epic...</span>
                </div>
              </div>

              <button className="w-full py-3.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all flex justify-center items-center gap-2 cursor-pointer">
                <Sparkles size={16} />
                <span>Generate Video</span>
              </button>
            </div>

            {/* Right Col - Media Grid */}
            <div className="flex-[1.5] flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-3 flex-1 h-[240px]">
                {/* Main Video View */}
                <div className="col-span-2 row-span-2 bg-black/50 border border-white/5 rounded-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 cursor-pointer">
                      <Play size={20} className="text-white fill-white ml-1" />
                    </div>
                  </div>
                  <img src="https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Preview 1" className="w-full h-full object-cover" />
                </div>
                {/* Thumb 1 */}
                <div className="col-span-1 bg-black/50 border border-white/5 rounded-2xl overflow-hidden">
                  <img src="https://images.pexels.com/photos/2088170/pexels-photo-2088170.jpeg?auto=compress&cs=tinysrgb&w=300" alt="Preview 2" className="w-full h-full object-cover" />
                </div>
                {/* Thumb 2 */}
                <div className="col-span-1 bg-black/50 border border-white/5 rounded-2xl overflow-hidden">
                  <img src="https://images.pexels.com/photos/15286/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=300" alt="Preview 3" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Audio Waveform */}
              <div className="h-20 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-center p-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10" />
                {/* Fake waveform bars */}
                <div className="flex items-center gap-1.5 w-full h-full justify-center px-6">
                  {[...Array(45)].map((_, i) => (
                    <div key={i} className="w-1.5 bg-purple-500/80 rounded-full" style={{ 
                      height: `${Math.max(15, Math.sin(i * 0.4) * 50 + Math.random() * 30)}%`,
                      opacity: Math.random() * 0.4 + 0.6
                    }} />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Editor Sidebar Tools */}
            <div className="hidden md:flex flex-col gap-4 p-3 bg-black/40 border border-white/5 rounded-2xl justify-center items-center">
               <Layers size={16} className="text-gray-400 hover:text-white cursor-pointer" />
               <FileText size={16} className="text-gray-400 hover:text-white cursor-pointer" />
               <Volume2 size={16} className="text-gray-400 hover:text-white cursor-pointer" />
               <Sparkles size={16} className="text-gray-400 hover:text-white cursor-pointer" />
            </div>
          </div>
          
          {/* Feature Badges below mockup */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            {['✦ AI Voice', '✦ AI Backgrounds', '✦ AI Script Generator', '✦ Auto Captions', '✦ 3D Rendering'].map((feature, i) => (
               <div key={i} className="px-5 py-2 rounded-full bg-white/5 border border-white/10 text-gray-300 text-[11px] font-mono tracking-wider shadow-sm">
                 {feature}
               </div>
            ))}
          </div>
        </motion.div>
        
        {/* INTERACTIVE STUDIO PREVIEW SHOWCASE is next */}
      </section>
.
w
ED_CMD
