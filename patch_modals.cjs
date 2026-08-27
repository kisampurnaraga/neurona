const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `{isContentCreatorOpen && (
            <ContentCreatorDashboard onClose={() => setIsContentCreatorOpen(false)} />
          )}`;

const replaceStr = `{isRenderGalleryOpen && (
            <RenderGalleryModal onClose={() => setIsRenderGalleryOpen(false)} />
          )}
          {/* Content Creator Dashboard */}
          {isContentCreatorOpen && (
            <ContentCreatorDashboard onClose={() => setIsContentCreatorOpen(false)} />
          )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched App.tsx for RenderGalleryModal');
} else {
  console.log('Target string not found');
}
