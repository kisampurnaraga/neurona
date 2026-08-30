import fs from 'fs';
let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

const oldClip = `
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
`;

const newClip = `
    // SMART PACING CLIP AT TOP LEVEL
    if (result && result.correctedScript) {
        const durationSecs = input.durationSeconds || 5;
        const maxWordsAllowed = Math.floor(durationSecs * 2.2);
        const finalWords = result.correctedScript.split(/\\s+/).filter(Boolean);
        if (finalWords.length > maxWordsAllowed) {
            // Find the closest punctuation before maxWordsAllowed
            const truncated = finalWords.slice(0, maxWordsAllowed).join(' ');
            const lastPunc = truncated.search(/[.!?](?!.*[.!?])/); // Find last occurence of punctuation
            
            if (lastPunc !== -1) {
                result.correctedScript = truncated.substring(0, lastPunc + 1);
                result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest punctuation.]';
            } else {
                // If no punctuation, just take the first logical clause (comma) or fallback to just cutting at word limit with ...
                const lastComma = truncated.search(/,(?!.*,)/);
                if (lastComma !== -1) {
                    result.correctedScript = truncated.substring(0, lastComma) + '.';
                    result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest comma.]';
                } else {
                    result.correctedScript = finalWords.slice(0, maxWordsAllowed).join(' ') + '.';
                    result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Hard-clipped VO pacing.]';
                }
            }
        }
    }
`;

if (content.includes(oldClip.trim())) {
    content = content.replace(oldClip.trim(), newClip.trim());
} else {
    console.log("Could not find old clip block to replace!");
}

// Also update the LLM instruction for pacing in QA Agent
const oldQaInstruction = "PACING LIMIT: Naskah MAKSIMAL 2 kata per detik untuk TTS Indonesia. Jika durasi ${input.durationSeconds || 5}s, naskah MAKSIMAL ${Math.floor((input.durationSeconds || 5) * 2)} KATA. Jika lebih dari itu, WAJIB dipotong/diringkas secara ekstrem.";

const newQaInstruction = "PACING LIMIT (CRITICAL): Naskah MAKSIMAL 2 kata per detik untuk TTS Indonesia. Jika durasi ${input.durationSeconds || 5}s, naskah MAKSIMAL ${Math.floor((input.durationSeconds || 5) * 2)} KATA. WAJIB tulis kalimat yang PENDEK TAPI UTUH (selesai pada tanda titik). Jangan buat kalimat panjang lalu dipotong menggantung.";

content = content.replace(oldQaInstruction, newQaInstruction);
content = content.replace("3. Narrative Flow & TTS Duration (0-100)", "3. Narrative Flow & TTS Duration (0-100) - VO MUST be short, complete sentences under 2 words/sec. No hanging sentences.");

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Updated qaAuditAgent.ts smart clip and prompt.");
