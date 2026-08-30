import fs from 'fs';
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

content = content.replace(
    /const finalScript = data\.correctedScript \|\| input\.voiceoverScript \|\| input\.script \|\| '';/g,
    `let finalScript = data.correctedScript || input.voiceoverScript || input.script || '';
    const maxWordsAllowed = Math.floor((input.durationSeconds || 5) * 2.2);
    const finalWords = finalScript.split(/\\s+/).filter(Boolean);
    if (finalWords.length > maxWordsAllowed) {
        finalScript = finalWords.slice(0, maxWordsAllowed).join(' ') + '...';
        data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Auto-clipped VO pacing.]';
    }`
);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Forced pacing truncation implemented.");
