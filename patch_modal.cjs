const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const target = `       } else if (!isFailed && project.finalVideoUrl && stitchProgress < 100) {
         setStitchProgress(100);
         setActiveStitchStep('Selesai');
         setFinalVideoUrl(project.finalVideoUrl);
         logToUI('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
         neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
       }`;

const replacement = `       } else if (!isFailed && project.finalVideoUrl && stitchProgress < 100) {
         setStitchProgress(100);
         setActiveStitchStep('Selesai');
         setFinalVideoUrl(project.finalVideoUrl);
         logToUI('🎉 SUKSES: Seluruh adegan video berhasil dijahit dan disatukan menjadi film utuh!');
         neuronaVoice.speak("Selamat! Proses penggabungan video telah berhasil diselesaikan secara utuh");
         setIsStitching(false);
       } else if (!isFailed && !project.finalVideoUrl && stitchProgress > 0 && stitchProgress < 100) {
         setStitchProgress(100);
         setActiveStitchStep('Selesai');
         logToUI('Proses backend selesai, namun URL video master belum tersedia.');
         setIsStitching(false);
       }`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('PATCHED MODAL');
} else {
  console.log('TARGET NOT FOUND');
}
