const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const effectTarget = `  // Monitor project updates from SSE for async stitching
  useEffect(() => {
    if (!project) return;
    
    // If the project is currently processing orchestration (stitching)
    if (project.status === 'PROCESSING' && isStitching) {
       // We can sync progress if the backend emits overallProgress, 
       // but for now we know it's processing.
       // The backend doesn't currently update overallProgress during the stitching steps of ffmpeg, 
       // but we could just show a spinner or a 95% progress.
       setStitchProgress(95);
       setActiveStitchStep('Menunggu proses server...');
    }
    
    // If stitching just completed asynchronously
    if (isStitching && project.status === 'COMPLETED' && project.finalVideoUrl) {
       setIsStitching(false);
       setStitchProgress(100);
       setActiveStitchStep('Selesai');
       setFinalVideoUrl(project.finalVideoUrl);
       log('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
       neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
    }
    
    // If stitching failed asynchronously (project might go back to COMPLETED but no finalVideoUrl and there might be an error log)
    // Wait, how does backend indicate failure of async stitch?
    // It sets project.status = 'COMPLETED' but finalVideoUrl is NOT set (or remains null/undefined), and an error log is appended.
    // If project.status === 'COMPLETED' but no finalVideoUrl, and we were stitching... wait, it could also mean something else.
    // Let's check orchestrationResult?
    if (isStitching && project.status === 'COMPLETED' && !project.finalVideoUrl && (project as any).orchestrationResult === null) {
        // Did it fail?
    }
  }, [project, isStitching]);`;

const effectReplacement = `  // Monitor project updates from SSE for async stitching
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

if (code.includes(effectTarget)) {
  code = code.replace(effectTarget, effectReplacement);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('REPLACED EFFECT');
} else {
  console.log('EFFECT NOT FOUND');
}
