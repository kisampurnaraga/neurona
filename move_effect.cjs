const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const effectToRemove = `  // Monitor project updates from SSE for async stitching
  useEffect(() => {
    if (!project) return;
    
    if (project.status === 'PROCESSING') {
       if (!showStitchModal) {
         setShowStitchModal(true);
       }
       if (stitchProgress === 0) {
         setStitchProgress(95);
         setActiveStitchStep('Menunggu proses server...');
         log('⏳ PROSES: Perakitan video master sedang berjalan di latar belakang...');
       }
    }
    
    if (showStitchModal && project.status === 'COMPLETED') {
       const logs = project.logs || (project as any).script?.logs || [];
       const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
       const isFailed = lastLog && lastLog.level === 'ERROR' && lastLog.message.includes('Gagal menjahit');
       
       if (isFailed && stitchProgress > 0) {
         log(\`❌ GAGAL PENGGABUNGAN: \${lastLog.message}\`);
         setStitchProgress(0);
         setActiveStitchStep('Gagal');
         setFinalVideoUrl(null);
         neuronaVoice.speak(\`Gagal menggabungkan video.\`);
       } else if (!isFailed && project.finalVideoUrl && stitchProgress < 100) {
         setStitchProgress(100);
         setActiveStitchStep('Selesai');
         setFinalVideoUrl(project.finalVideoUrl);
         log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
         neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
       }
    }
  }, [project?.status, project?.finalVideoUrl, showStitchModal, stitchProgress]);`;

if (code.includes(effectToRemove)) {
  code = code.replace(effectToRemove, '');
  console.log('REMOVED ORIGINAL EFFECT');
} else {
  console.log('COULD NOT FIND ORIGINAL EFFECT TO REMOVE');
}

const effectToInsert = `  // Monitor project updates from SSE for async stitching
  useEffect(() => {
    if (!project) return;

    const logToUI = (msg: string) => {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setStitchLogs(prev => [...prev, \`[\${timeStr}] \${msg}\`]);
      setChatHistory(prev => [
        ...prev,
        {
          sender: 'agent',
          message: msg,
          timestamp: timeStr
        }
      ]);
    };
    
    if (project.status === 'PROCESSING') {
       if (!showStitchModal) {
         setShowStitchModal(true);
       }
       if (stitchProgress === 0) {
         setStitchProgress(95);
         setActiveStitchStep('Menunggu proses server...');
         logToUI('⏳ PROSES: Perakitan video master sedang berjalan di latar belakang...');
       }
    }
    
    if (showStitchModal && project.status === 'COMPLETED') {
       const logs = project.logs || (project as any).script?.logs || [];
       const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
       const isFailed = lastLog && lastLog.level === 'ERROR' && lastLog.message.includes('Gagal menjahit');
       
       if (isFailed && stitchProgress > 0) {
         logToUI(\`❌ GAGAL PENGGABUNGAN: \${lastLog.message}\`);
         setStitchProgress(0);
         setActiveStitchStep('Gagal');
         setFinalVideoUrl(null);
         neuronaVoice.speak(\`Gagal menggabungkan video.\`);
       } else if (!isFailed && project.finalVideoUrl && stitchProgress < 100) {
         setStitchProgress(100);
         setActiveStitchStep('Selesai');
         setFinalVideoUrl(project.finalVideoUrl);
         logToUI('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
         neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
       }
    }
  }, [project?.status, project?.finalVideoUrl, showStitchModal, stitchProgress]);`;

const insertTarget = `const [stitchProgress, setStitchProgress] = useState<number>(0);`;

if (code.includes(insertTarget)) {
  code = code.replace(insertTarget, insertTarget + '\n\n' + effectToInsert);
  console.log('INSERTED NEW EFFECT');
} else {
  console.log('COULD NOT FIND INSERT TARGET');
}

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
