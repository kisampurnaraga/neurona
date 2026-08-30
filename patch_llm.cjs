const fs = require('fs');
const content = fs.readFileSync('server/llmService.ts', 'utf8');

const target = `      "location": "Modern minimalist indoor setting"
    }
  ]
}

ATURAN LOGIKA SCENE-BY-SCENE (CRITICAL):
- "featuresProduct" (BOOLEAN): Bernilai true HANYA jika adegan ini secara visual memegang, mengoleskan, memakai, atau menyorot produk fisik. Bernilai false jika adegan ini murni menceritakan masalah, keluhan emosional (pain point), menggunakan "sepatu biasa/produk lain", atau hook sebelum produk SOLUSI diperkenalkan.
- "backgroundLock" (STRING: "locked" | "free"): Bernilai "locked" jika adegan bertempat di ruangan/setting fisik yang sama dengan adegan sebelumnya demi kontinuitas. Bernilai "free" jika adegan berganti lokasi/suasana baru.
- "location" (STRING): Deskripsi singkat setting fisik (misal: "Kamar tidur minimalis", "Kamar mandi modern", "Studio foto komersial").

FORMAT OUTPUT MUTLAK: JSON\`;`;

const replacement = `      "visualStyle": "\\\${videoType === 'AFFILIATE' ? 'ugc' : 'studio'}",
      "location": "Modern minimalist indoor setting"
    }
  ]
}

ATURAN LOGIKA SCENE-BY-SCENE (CRITICAL):
- "visualStyle" (STRING): WAJIB "ugc" jika Affiliate, WAJIB "studio" jika bukan Affiliate.
- "featuresProduct" (BOOLEAN): Bernilai true HANYA jika adegan ini secara visual memegang, mengoleskan, memakai, atau menyorot produk fisik. Bernilai false jika adegan ini murni menceritakan masalah, keluhan emosional (pain point), menggunakan "sepatu biasa/produk lain", atau hook sebelum produk SOLUSI diperkenalkan.
- "backgroundLock" (STRING: "locked" | "free"): Bernilai "locked" jika adegan bertempat di ruangan/setting fisik yang sama dengan adegan sebelumnya demi kontinuitas. Bernilai "free" jika adegan berganti lokasi/suasana baru.
- "location" (STRING): Deskripsi singkat setting fisik (misal: "Kamar tidur minimalis", "Kamar mandi modern", "Studio foto komersial").

CRITICAL RULES FOR QA COMPLIANCE (MUST FOLLOW STRICTLY):
1. PACING: Voiceover max 2.2 words/second for Indonesian TTS. 3s scene = max 6 words, 4s scene = max 8 words. Keep it punchy!
2. VISUAL STYLE: You must explicitly set \\\`visualStyle\\\` field to "ugc" or "studio" based on videoType!
   - AFFILIATE default -> "ugc" (Authentic UGC creator perspective, shot on iPhone 15 front camera)
   - CONTENT/ANIMATION -> "studio" (Cinematic 35mm commercial shot, 50mm lens f/2.8)
   Never mix DSLR/35mm prompts inside UGC style.
3. PRODUCT REFERENCE: Every visual prompt MUST mention the actual product name explicitly (not generic words).
4. CAMERA MOVEMENT: \\\`promptImageToVideo\\\` MUST contain one of: "pan", "dolly", "zoom", "tracking", "orbital", "tilt", "pedestal", "crane", "handheld camera movement".
5. NEVER include: "text on screen", "subtitle", "typography", "writing", "font".

FORMAT OUTPUT MUTLAK: JSON\`;`;

if (content.includes(target)) {
  fs.writeFileSync('server/llmService.ts', content.replace(target, replacement));
  console.log("Patch applied successfully");
} else {
  console.error("Target not found");
}
