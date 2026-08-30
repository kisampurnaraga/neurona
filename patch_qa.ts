import fs from 'fs';

let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

// Fix English to Indonesian for OpenAI issues and recommendations
content = content.replace(
  "Return JSON with: passed (boolean), score (number), breakdown { productLockConsistency, visualPromptAdherence, narrativeFlow }, issues (array), recommendations (array), correctedVideoPrompt (string in English cinematic prompt for AI Video Engines. MUST include character physically holding/using product if AFFILIATE), correctedScript (string), correctedVisualPrompt (string. MUST include character physically holding/using product if AFFILIATE), auditNotes (string).",
  "Return JSON with: passed (boolean), score (number), breakdown { productLockConsistency, visualPromptAdherence, narrativeFlow }, issues (array of strings IN INDONESIAN), recommendations (array of strings IN INDONESIAN), correctedVideoPrompt (string in English cinematic prompt for AI Video Engines. MUST include character physically holding/using product if AFFILIATE), correctedScript (string IN INDONESIAN), correctedVisualPrompt (string in English. MUST include character physically holding/using product if AFFILIATE), auditNotes (string IN INDONESIAN)."
);

content = content.replace(
  "Format Output WAJIB JSON murni tanpa markdown pembungkus.",
  "Format Output WAJIB JSON murni tanpa markdown pembungkus. Kamu WAJIB merespons seluruh field seperti `issues` (Daftar Masalah), `recommendations` (Rekomendasi), dan `auditNotes` dalam Bahasa Indonesia."
);


// Replace the first smart pacing slicer
content = content.replace(
  /if \(finalWords\.length > maxWordsAllowed\) \{\s*const truncated = finalWords\.slice\(0, maxWordsAllowed\)\.join\(' '\);\s*const lastPunc = truncated\.search\(\/\[\.\!\?\]\(\?\!\.\\*\[\.\!\?\]\)\/\);\s*if \(lastPunc !== -1\) \{\s*result\.correctedScript = truncated\.substring\(0, lastPunc \+ 1\);\s*result\.auditNotes = \(result\.auditNotes \|\| ''\) \+ ' \[SYSTEM: Smart-clipped VO pacing to nearest punctuation\.\]';\s*\} else \{\s*\/\/ If no punctuation, just take the first logical clause \(comma\) or fallback to just cutting at word limit with \.\.\.\s*const lastComma = truncated\.search\(\/,\(\?\!\.\*,\)\/\);\s*if \(lastComma !== -1\) \{\s*result\.correctedScript = truncated\.substring\(0, lastComma\) \+ '\.';\s*result\.auditNotes = \(result\.auditNotes \|\| ''\) \+ ' \[SYSTEM: Smart-clipped VO pacing to nearest comma\.\]';\s*\} else \{\s*result\.correctedScript = finalWords\.slice\(0, maxWordsAllowed\)\.join\(' '\) \+ '\.';\s*result\.auditNotes = \(result\.auditNotes \|\| ''\) \+ ' \[SYSTEM: Hard-clipped VO pacing\.\]';\s*\}\s*\}\s*\}/g,
  `if (finalWords.length > maxWordsAllowed) {
            let truncated = finalWords.slice(0, maxWordsAllowed).join(' ');
            const lastPuncMatch = truncated.match(/.*[.!?]/);
            if (lastPuncMatch) {
                result.correctedScript = lastPuncMatch[0];
                result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest punctuation.]';
            } else {
                const lastCommaMatch = truncated.match(/.*,/);
                if (lastCommaMatch) {
                    result.correctedScript = lastCommaMatch[0].slice(0, -1) + '.';
                    result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest comma.]';
                } else {
                    let limit = maxWordsAllowed;
                    const hangingWords = ['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'dengan', 'untuk', 'ini', 'itu', 'sangat', 'juga', 'akan', 'bisa', 'lebih'];
                    while (limit > 0 && hangingWords.includes(finalWords[limit - 1].toLowerCase().replace(/[^a-z]/g, ''))) {
                        limit--;
                    }
                    result.correctedScript = finalWords.slice(0, limit).join(' ') + '.';
                    result.auditNotes = (result.auditNotes || '') + ' [SYSTEM: Hard-clipped VO pacing (removed hanging words).]';
                }
            }
        }`
);

// Replace the second smart pacing slicer
content = content.replace(
  /if \(finalWords\.length > maxWordsAllowed\) \{\s*const truncated = finalWords\.slice\(0, maxWordsAllowed\)\.join\(' '\);\s*const lastPunc = truncated\.search\(\/\[\.\!\?\]\(\?\!\.\\*\[\.\!\?\]\)\/\);\s*if \(lastPunc !== -1\) \{\s*finalScript = truncated\.substring\(0, lastPunc \+ 1\);\s*data\.auditNotes = \(data\.auditNotes \|\| ''\) \+ ' \[SYSTEM: Smart-clipped VO pacing to nearest punctuation\.\]';\s*\} else \{\s*const lastComma = truncated\.search\(\/,\(\?\!\.\*,\)\/\);\s*if \(lastComma !== -1\) \{\s*finalScript = truncated\.substring\(0, lastComma\) \+ '\.';\s*data\.auditNotes = \(data\.auditNotes \|\| ''\) \+ ' \[SYSTEM: Smart-clipped VO pacing to nearest comma\.\]';\s*\} else \{\s*finalScript = finalWords\.slice\(0, maxWordsAllowed\)\.join\(' '\) \+ '\.';\s*data\.auditNotes = \(data\.auditNotes \|\| ''\) \+ ' \[SYSTEM: Hard-clipped VO pacing\.\]';\s*\}\s*\}\s*\}/g,
  `if (finalWords.length > maxWordsAllowed) {
        let truncated = finalWords.slice(0, maxWordsAllowed).join(' ');
        const lastPuncMatch = truncated.match(/.*[.!?]/);
        if (lastPuncMatch) {
            finalScript = lastPuncMatch[0];
            data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest punctuation.]';
        } else {
            const lastCommaMatch = truncated.match(/.*,/);
            if (lastCommaMatch) {
                finalScript = lastCommaMatch[0].slice(0, -1) + '.';
                data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Smart-clipped VO pacing to nearest comma.]';
            } else {
                let limit = maxWordsAllowed;
                const hangingWords = ['dan', 'atau', 'yang', 'di', 'ke', 'dari', 'dengan', 'untuk', 'ini', 'itu', 'sangat', 'juga', 'akan', 'bisa', 'lebih'];
                while (limit > 0 && hangingWords.includes(finalWords[limit - 1].toLowerCase().replace(/[^a-z]/g, ''))) {
                    limit--;
                }
                finalScript = finalWords.slice(0, limit).join(' ') + '.';
                data.auditNotes = (data.auditNotes || '') + ' [SYSTEM: Hard-clipped VO pacing (removed hanging words).]';
            }
        }
    }`
);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
console.log("Patched QA");
