const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const target = `    if (showStitchModal && project.status === 'COMPLETED') {`;

const replacement = `    if (showStitchModal && project.status === 'FAILED' && stitchProgress > 0) {
       logToUI(\`❌ GAGAL PENGGABUNGAN: \${project.error || 'Proses terputus.'}\`);
       setStitchProgress(0);
       setActiveStitchStep('Gagal');
       setFinalVideoUrl(null);
       neuronaVoice.speak(\`Gagal menggabungkan video.\`);
       setIsStitching(false);
    }
    
    if (showStitchModal && project.status === 'COMPLETED') {`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('PATCHED MODAL FAIL');
} else {
  console.log('TARGET NOT FOUND');
}
