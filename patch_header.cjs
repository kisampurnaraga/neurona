const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `              {providerInfo && (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-gray-400 bg-[#0A0A0A] border border-[#222] px-2.5 py-1 rounded-full">
                  <span className={\`w-1.5 h-1.5 rounded-full \${providerInfo.status === 'READY' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400'}\`}></span>
                  <span className="uppercase">{providerInfo.provider}</span>
                </div>
              )}`;

const replaceStr = `              {providerInfo && (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-gray-400 bg-[#0A0A0A] border border-[#222] px-2.5 py-1 rounded-full">
                  <span className={\`w-1.5 h-1.5 rounded-full \${providerInfo.status === 'READY' ? 'bg-indigo-400 animate-pulse' : 'bg-amber-400'}\`}></span>
                  <span className="uppercase">{providerInfo.provider}</span>
                </div>
              )}
              
              <button
                onClick={() => setIsSystemHealthOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-[10px] font-mono uppercase text-gray-400 hover:text-cyan-300 transition-colors"
                title="System Health Dashboard"
              >
                <Activity size={11} className="text-cyan-400" />
                <span className="hidden sm:inline">System Health</span>
              </button>`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/App.tsx', code);
  console.log('Patched App.tsx with System Health Dashboard button');
} else {
  console.log('Target string not found');
}
