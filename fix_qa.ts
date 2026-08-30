import * as fs from 'fs';
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

content = content.replace(
    /- Rasio kata naskah harus realistis sesuai durasi \$\{input\.durationSeconds \|\| 5\} detik \(sekitar 2\.5 kata per detik untuk bahasa Indonesia\)\./,
    "- PACING LIMIT: Naskah MAKSIMAL 2 kata per detik untuk TTS Indonesia. Jika durasi ${input.durationSeconds || 5}s, naskah MAKSIMAL ${Math.floor((input.durationSeconds || 5) * 2)} KATA. Jika lebih dari itu, WAJIB dipotong/diringkas secara ekstrem."
);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Fixed QA agent pacing rules.");
