const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

const target = `      // Validasi Keunikan Scene`;
const replacement = `      // Safety Check: Override featuresProduct to false if scene describes a pain point/before state
      generatedScenes.forEach((s, idx) => {
        const text = (s.visualDirection + " " + (s.promptTextToImage || "")).toLowerCase();
        const isPainPoint = text.includes('before') || text.includes('pain point') || text.includes('kesakitan') || text.includes('biasa') || text.includes('frustrasi') || text.includes('struggling') || text.includes('sulit') || text.includes('susah') || text.includes('masalah');
        const hasSolusi = text.includes('solusi') || text.includes('menemukan') || (project.affiliateConfig?.productName && text.includes(project.affiliateConfig.productName.toLowerCase()));
        
        if (isPainPoint && !hasSolusi) {
           s.featuresProduct = false;
        }
      });

      // Validasi Keunikan Scene`;

content = content.replace(target, replacement);
fs.writeFileSync('server/orchestrator.ts', content);
