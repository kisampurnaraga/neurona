const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

const regex = /\/\/ Fallback prevention\s+if \(generatedScenes\.length === 0\) \{[\s\S]*?\/\/ Validasi Keunikan Scene\s+if \(generatedScenes\.length >= 2\) \{[\s\S]*?throw new Error\("Gagal menyusun naskah — AI menghasilkan adegan yang berulang\/duplikat \(ANOMALI\)\. Silakan coba lagi\."\);\s+\}\s+\}/;

// Wait, the block is heavily duplicated. Let's just find the start:
const startString = '// Fallback prevention';
let startIndex = content.indexOf(startString);
if (startIndex === -1) {
    console.error("Could not find '// Fallback prevention'");
    process.exit(1);
}

// Find the end of this duplicate mess by looking for the next piece of code, which might be:
const nextString = 'project.storyboard = {';
let endIndex = content.indexOf(nextString, startIndex);
if (endIndex === -1) {
    console.error("Could not find 'project.storyboard = {'");
    process.exit(1);
}

const replacement = `      // Fallback prevention
      if (generatedScenes.length === 0) {
        throw new Error("Gagal menyusun naskah — kuota AI Director sedang bermasalah atau error dari penyedia layanan AI. Silakan coba lagi nanti.");
      }

      // Safety Check: Override featuresProduct to false if scene describes a pain point/before state
      generatedScenes.forEach((s) => {
        const text = (s.visualDirection + " " + (s.promptTextToImage || "")).toLowerCase();
        const isPainPoint = text.includes('before') || text.includes('pain point') || text.includes('kesakitan') || text.includes('biasa') || text.includes('frustrasi') || text.includes('struggling') || text.includes('sulit') || text.includes('susah') || text.includes('masalah');
        const hasSolusi = text.includes('solusi') || text.includes('menemukan') || (project.affiliateConfig?.productName && text.includes(project.affiliateConfig.productName.toLowerCase()));
        
        if (isPainPoint && !hasSolusi) {
           s.featuresProduct = false;
        }
      });

      // Validasi Keunikan Scene (Cek semua pasangan adegan)
      if (generatedScenes.length >= 2) {
        for (let i = 0; i < generatedScenes.length - 1; i++) {
          const currentP = (generatedScenes[i].promptTextToImage || generatedScenes[i].visualDirection || "").trim();
          const nextP = (generatedScenes[i + 1].promptTextToImage || generatedScenes[i + 1].visualDirection || "").trim();
          
          if (currentP && nextP && currentP === nextP) {
            throw new Error("Gagal menyusun naskah — AI menghasilkan adegan yang berulang/duplikat (ANOMALI). Silakan coba lagi.");
          }
        }
      }

      `;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync('server/orchestrator.ts', content);
console.log('Fixed duplications and updated uniqueness validation');
