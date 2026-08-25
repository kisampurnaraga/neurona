const fs = require('fs');
let path = 'src/components/AffiliateConfigModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  /const \[platform, setPlatform\] = useState/,
  `const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('9:16');\n  const [platform, setPlatform] = useState`
);

c = c.replace(
  /platform: preset\.platform,/g,
  `platform: preset.platform,\n        aspectRatio: '9:16',`
);

c = c.replace(
  /platform,\n\s*keyBenefits,/g,
  `platform,\n      aspectRatio,\n      keyBenefits,`
);

const newUI = `            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Rasio Video (Resolusi)</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['9:16', '1:1', '16:9'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={\`py-2 px-2.5 rounded-lg text-[10px] font-semibold border transition-all text-center \${
                      aspectRatio === ratio
                        ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-sm'
                        : 'bg-[#121216] border-[#27272a] text-gray-400 hover:text-gray-200'
                    }\`}
                  >
                    {ratio === '9:16' ? 'Vertikal (9:16)' : ratio === '1:1' ? 'Persegi (1:1)' : 'Lanskap (16:9)'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Platform Target</label>`;

c = c.replace(
  /<div className="space-y-1">\s*<label className="text-\[10px\] uppercase font-bold text-gray-400">Platform Target<\/label>/,
  newUI
);

fs.writeFileSync(path, c);
