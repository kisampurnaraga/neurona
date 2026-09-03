const fs = require('fs');
let code = fs.readFileSync('src/components/VideoTimeline.tsx', 'utf-8');

const target = `  useEffect(() => {
    if (project?.storyboard?.scenes && project.storyboard.scenes.length > 0) {`;

const replacement = `  useEffect(() => {
    if (project) {
      if (project.status === 'COMPLETED' || project.status === 'FAILED') {
         setIsStitching(false);
         if (project.status === 'COMPLETED') setStitchMessage('Fast re-stitch berhasil selesai!');
      }
    }
    if (project?.storyboard?.scenes && project.storyboard.scenes.length > 0) {`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/components/VideoTimeline.tsx', code);
  console.log('PATCHED TIMELINE EFFECT');
} else {
  console.log('TARGET NOT FOUND');
}
