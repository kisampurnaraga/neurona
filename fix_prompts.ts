import * as fs from 'fs';

let llmService = fs.readFileSync('server/llmService.ts', 'utf8');

// Update rule 4 in llmService
llmService = llmService.replace(
    /- Buat teks narasi voiceover yang hidup, berbobot emosional, dan berirama pas dengan durasi tiap adegan\./g,
    "- BATAS KATA SANGAT KETAT: TTS membaca lambat (max 2 kata per detik). Untuk adegan 3 detik, MAKSIMAL 6 KATA. Untuk adegan 4 detik, MAKSIMAL 8 KATA. Jika melanggar, audio akan error terpotong! Gunakan kalimat SANGAT PENDEK dan to-the-point."
);

// Update pacing in QA compliance block
llmService = llmService.replace(
    /1\. PACING: Voiceover max 2\.2 words\/second for Indonesian TTS\. 3s scene = max 6 words, 4s scene = max 8 words\. Keep it punchy!/g,
    "1. PACING (CRITICAL): Voiceover MAX 2 words/second. 3s scene = MAX 6 words. 4s scene = MAX 8 words. NEVER write 16 words for a 4s scene!"
);

fs.writeFileSync('server/llmService.ts', llmService);


let imageService = fs.readFileSync('server/imageService.ts', 'utf8');

// Replace styleSuffix logic to respect scene.visualStyle strictly
const styleReplacement = `    } else if (videoType === 'AFFILIATE') {
      const visualStyle = scene.visualStyle || 'ugc';
      if (visualStyle === 'studio') {
        styleSuffix = 'commercial advertising photograph, professional product presentation, sharp focus, clean studio backdrop, balanced key lighting, 8k resolution';
      } else {
        styleSuffix = 'authentic smartphone UGC video camera perspective, natural warm indoor lighting, authentic human skin texture with pores, raw and candid';
      }
    } else {
      styleSuffix = 'Cinematic 8k movie still, anamorphic lens flare, master shot, photorealistic';
    }

    const endModifiers = \`\${styleSuffix}\`;`; // Removed hardcoded --seed ${seed}

imageService = imageService.replace(
    /    \} else if \(videoType === 'AFFILIATE'\) \{[\s\S]*?const endModifiers = `\$\{styleSuffix\}, sharp focus, 8k resolution, professional advertising photography --seed \$\{seed\}`;/,
    styleReplacement
);

fs.writeFileSync('server/imageService.ts', imageService);


let orchestrator = fs.readFileSync('server/orchestrator.ts', 'utf8');

// Remove --seed 3819401 from prompts
orchestrator = orchestrator.replace(/ --seed 3819401/g, '');

// Randomize styleSeed in fallback templates
orchestrator = orchestrator.replace(/styleSeed: 3819401/g, 'styleSeed: Math.floor(Math.random() * 10000000)');

fs.writeFileSync('server/orchestrator.ts', orchestrator);

console.log("Fixed llmService pacing, imageService styleSuffix & seed, orchestrator hardcoded seeds.");
