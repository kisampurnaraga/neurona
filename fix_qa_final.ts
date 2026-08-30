import fs from 'fs';
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

const replacement = `
    // FORCE PACING CLIP AT TOP LEVEL
    if (result && result.correctedScript) {
        const durationSecs = input.durationSeconds || 5;
        const maxWordsAllowed = Math.floor(durationSecs * 2.2);
        const finalWords = result.correctedScript.split(/\\s+/).filter(Boolean);
        if (finalWords.length > maxWordsAllowed) {
            result.correctedScript = finalWords.slice(0, maxWordsAllowed).join(' ');
            result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Auto-clipped VO pacing to ' + maxWordsAllowed + ' words.]';
        }
    }

    return result;
`;

content = content.replace(
    /return this\.runHeuristicAudit\(input, rawPrompt, rawScript, rawVisual, duration, aspect\);/g,
    `const result = this.runHeuristicAudit(input, rawPrompt, rawScript, rawVisual, duration, aspect);
${replacement}`
);

content = content.replace(
    /return result;/g,
    replacement
);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Forced pacing truncation globally.");
