const fs = require('fs');
let code = fs.readFileSync('src/components/VideoPreviewPlayer.tsx', 'utf8');

const targetStr = `          <span className="text-cyan-400 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
            {activeAgent}
          </span>`;
const replaceStr = `          <span className="text-cyan-400 font-semibold truncate max-w-[120px] sm:max-w-[180px]">
            {activeAgent}
          </span>
          {videoModel && (
            <span className={\`px-2 py-0.5 flex items-center gap-1 rounded-full border text-[9px] font-bold \${
              modelHealth === 'Ready' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' : 
              modelHealth === 'Failed' ? 'bg-rose-950/80 text-rose-300 border-rose-500/50' :
              'bg-slate-900/80 text-slate-300 border-slate-500/50'
            }\`}>
               {modelHealth === 'Processing' ? <Loader2 size={9} className="animate-spin" /> : 
                modelHealth === 'Failed' ? <AlertCircle size={9} /> : <Zap size={9} />}
               <span>Q: {modelHealth.toUpperCase()}</span>
            </span>
          )}`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/VideoPreviewPlayer.tsx', code);
  console.log('Patched top bar UI');
} else {
  console.log('Target string not found');
}
