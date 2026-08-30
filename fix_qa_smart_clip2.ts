import fs from 'fs';
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

const hardClip1 = `let finalScript = data.correctedScript || input.voiceoverScript || input.script || '';
    const maxWordsAllowed = Math.floor((input.durationSeconds || 5) * 2.2);
    const finalWords = finalScript.split(/\\s+/).filter(Boolean);
    if (finalWords.length > maxWordsAllowed) {
        finalScript = finalWords.slice(0, maxWordsAllowed).join(' ') + '...';
        data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Auto-clipped VO pacing.]';
    }`;

const smartClip = `let finalScript = data.correctedScript || input.voiceoverScript || input.script || '';
    const maxWordsAllowed = Math.floor((input.durationSeconds || 5) * 2.2);
    const finalWords = finalScript.split(/\\s+/).filter(Boolean);
    if (finalWords.length > maxWordsAllowed) {
        const truncated = finalWords.slice(0, maxWordsAllowed).join(' ');
        const lastPunc = truncated.search(/[.!?](?!.*[.!?])/);
        if (lastPunc !== -1) {
            finalScript = truncated.substring(0, lastPunc + 1);
            data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest punctuation.]';
        } else {
            const lastComma = truncated.search(/,(?!.*,)/);
            if (lastComma !== -1) {
                finalScript = truncated.substring(0, lastComma) + '.';
                data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest comma.]';
            } else {
                finalScript = finalWords.slice(0, maxWordsAllowed).join(' ') + '.';
                data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Hard-clipped VO pacing.]';
            }
        }
    }`;

content = content.replace(hardClip1, smartClip);

// There might be another one in the heuristic fallback (bottom of file)
const hardClip2 = `let correctedScript = rawScript;
    if (wordCount > maxWords && rawScript.length > 0) {
      const words = rawScript.split(/\\s+/);
      correctedScript = words.slice(0, maxWords).join(' ') + '...';
    }`;

const smartClip2 = `let correctedScript = rawScript;
    if (wordCount > maxWords && rawScript.length > 0) {
      const words = rawScript.split(/\\s+/);
      const truncated = words.slice(0, maxWords).join(' ');
      const lastPunc = truncated.search(/[.!?](?!.*[.!?])/);
      if (lastPunc !== -1) {
          correctedScript = truncated.substring(0, lastPunc + 1);
      } else {
          const lastComma = truncated.search(/,(?!.*,)/);
          if (lastComma !== -1) {
              correctedScript = truncated.substring(0, lastComma) + '.';
          } else {
              correctedScript = words.slice(0, maxWords).join(' ') + '.';
          }
      }
    }`;

content = content.replace(hardClip2, smartClip2);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Updated both clip locations in qaAuditAgent.ts");
