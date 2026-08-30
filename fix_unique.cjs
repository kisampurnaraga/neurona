const fs = require('fs');
let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

const target = `      // Validasi Keunikan Scene (Cek semua pasangan adegan)
      if (generatedScenes.length >= 2) {
        for (let i = 0; i < generatedScenes.length - 1; i++) {
          const currentP = (generatedScenes[i].promptTextToImage || generatedScenes[i].visualDirection || "").trim();
          const nextP = (generatedScenes[i + 1].promptTextToImage || generatedScenes[i + 1].visualDirection || "").trim();
          
          if (currentP && nextP && currentP === nextP) {
            throw new Error("Gagal menyusun naskah — AI menghasilkan adegan yang berulang/duplikat (ANOMALI). Silakan coba lagi.");
          }
        }
      }`;

const replacement = `      // Validasi Keunikan Scene (Cek semua pasangan adegan secara komprehensif)
      if (generatedScenes.length >= 2) {
        const uniquePrompts = new Set();
        for (const scene of generatedScenes) {
          const prompt = (scene.promptTextToImage || scene.visualDirection || "").trim();
          if (prompt) {
            if (uniquePrompts.has(prompt)) {
              throw new Error("Gagal menyusun naskah — AI menghasilkan adegan yang berulang/duplikat (ANOMALI). Silakan coba lagi.");
            }
            uniquePrompts.add(prompt);
          }
        }
      }`;

content = content.replace(target, replacement);
fs.writeFileSync('server/orchestrator.ts', content);
