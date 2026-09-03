const fs = require('fs');
let code = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf-8');

const target1 = `                  disabled={isStitching}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isStitching ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}`;
                  
const replacement1 = `                  disabled={isStitching || project?.status === 'PROCESSING'}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  {isStitching || project?.status === 'PROCESSING' ? <Loader2 size={13} className="animate-spin" /> : <Film size={13} />}`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
  fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', code);
  console.log('REPLACED BTN LOGIC');
} else {
  console.log('TARGET BTN LOGIC NOT FOUND');
}
