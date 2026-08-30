const fs = require('fs');
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

const oldLogic = `  const handlePlayVoiceDemo = (voiceId: string, demoText: string) => {
    if (playingVoiceDemo === voiceId) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingVoiceDemo(null);
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    if (voiceId === 'voice_clone' && uploadedVoiceFile) {
      try {
        const audioUrl = URL.createObjectURL(uploadedVoiceFile);
        const audio = new Audio(audioUrl);
        setPlayingVoiceDemo(voiceId);
        audio.play().catch(() => setPlayingVoiceDemo(null));
        audio.onended = () => setPlayingVoiceDemo(null);
        audio.onerror = () => setPlayingVoiceDemo(null);
        return;
      } catch (e) {
        console.warn('Gagal memutar sampel suara unggahan:', e);
      }
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(demoText);
      utterance.lang = 'id-ID';
      if (voiceId === 'webspeech') {
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
      } else if (voiceId === 'minimax_turbo') {
        utterance.rate = 1.12;
        utterance.pitch = 1.05;
      } else if (voiceId === 'minimax_hd') {
        utterance.rate = 0.95;
        utterance.pitch = 1.02;
      } else if (voiceId === 'elevenlabs') {
        utterance.rate = 1.0;
        utterance.pitch = 1.08;
      } else {
        utterance.rate = 0.92;
        utterance.pitch = 0.95;
      }

      setPlayingVoiceDemo(voiceId);
      utterance.onend = () => setPlayingVoiceDemo(null);
      utterance.onerror = () => setPlayingVoiceDemo(null);
      
      window.speechSynthesis.speak(utterance);
    }
  };`;

const newLogic = `  const handlePlayVoiceDemo = async (voiceId: string, demoText: string) => {
    if (playingVoiceDemo === voiceId) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setPlayingVoiceDemo(null);
      if ((window as any).__currentDemoAudio) {
        try {
          (window as any).__currentDemoAudio.pause();
          (window as any).__currentDemoAudio = null;
        } catch (e) {}
      }
      return;
    }

    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    if ((window as any).__currentDemoAudio) {
      try {
        (window as any).__currentDemoAudio.pause();
        (window as any).__currentDemoAudio = null;
      } catch (e) {}
    }

    if (voiceId === 'voice_clone' && uploadedVoiceFile) {
      try {
        const audioUrl = URL.createObjectURL(uploadedVoiceFile);
        const audio = new Audio(audioUrl);
        setPlayingVoiceDemo(voiceId);
        (window as any).__currentDemoAudio = audio;
        audio.play().catch(() => setPlayingVoiceDemo(null));
        audio.onended = () => { setPlayingVoiceDemo(null); (window as any).__currentDemoAudio = null; };
        audio.onerror = () => { setPlayingVoiceDemo(null); (window as any).__currentDemoAudio = null; };
        return;
      } catch (e) {
        console.warn('Gagal memutar sampel suara unggahan:', e);
      }
    }

    if (voiceId === 'webspeech') {
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(demoText);
        utterance.lang = 'id-ID';
        setPlayingVoiceDemo(voiceId);
        utterance.onend = () => setPlayingVoiceDemo(null);
        utterance.onerror = () => setPlayingVoiceDemo(null);
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    const demoUrl = \`/demos/\${voiceId}.mp3\`;
    try {
      const res = await fetch(demoUrl, { method: 'HEAD' });
      if (!res.ok) {
        const name = NARRATOR_VOICES.find(v => v.id === voiceId)?.name || voiceId;
        alert(\`Demo suara \${name} belum tersedia, generate dulu di Founder Dashboard\`);
        return;
      }

      const audio = new Audio(demoUrl);
      setPlayingVoiceDemo(voiceId);
      (window as any).__currentDemoAudio = audio;

      audio.play().catch((e) => {
        console.error(e);
        setPlayingVoiceDemo(null);
      });
      audio.onended = () => { setPlayingVoiceDemo(null); (window as any).__currentDemoAudio = null; };
      audio.onerror = () => { setPlayingVoiceDemo(null); (window as any).__currentDemoAudio = null; };
    } catch (e) {
      console.error(e);
      const name = NARRATOR_VOICES.find(v => v.id === voiceId)?.name || voiceId;
      alert(\`Demo suara \${name} belum tersedia, generate dulu di Founder Dashboard\`);
    }
  };`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
