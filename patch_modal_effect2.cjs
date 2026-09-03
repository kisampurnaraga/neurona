const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const effectTarget = `  // Monitor project updates from SSE for async stitching
  useEffect(() => {
    if (!project) return;
    
    if (project.status === 'PROCESSING' && isStitching) {
       setStitchProgress(95);
       setActiveStitchStep('Menunggu proses server...');
    }
    
    if (isStitching && project.status === 'COMPLETED') {
       setIsStitching(false);
       
       const logs = project.logs || (project as any).script?.logs || [];
       const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;
       const isFailed = lastLog && lastLog.level === 'ERROR' && lastLog.message.includes('Gagal menjahit');
       
       if (isFailed) {
         log(\`❌ GAGAL PENGGABUNGAN: \${lastLog.message}\`);
         setStitchProgress(0);
         setActiveStitchStep('Gagal');
         setFinalVideoUrl(null);
         neuronaVoice.speak(\`Gagal menggabungkan video.\`);
       } else if (project.finalVideoUrl) {
         setStitchProgress(100);
         setActiveStitchStep('Selesai');
         setFinalVideoUrl(project.finalVideoUrl);
         log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
         neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
       }
    }
  }, [project, isStitching]);`;

const effectReplacement = `  // Monitor project updates from SSE for async stitching
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

if (code.includes(effectTarget)) {
  code = code.replace(effectTarget, effectReplacement);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('REPLACED EFFECT 2');
} else {
  console.log('EFFECT 2 NOT FOUND');
}
