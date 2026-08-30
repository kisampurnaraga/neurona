import fs from 'fs';

let content = fs.readFileSync('server/services/qaAuditAgent.ts', 'utf8');

const target1 = `        if (finalWords.length > maxWordsAllowed) {
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
        }`;

const replacement1 = `        if (finalWords.length > maxWordsAllowed) {
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
        }`;

content = content.replace(target1, replacement1);

const target2 = `    if (finalWords.length > maxWordsAllowed) {
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

const replacement2 = `    if (finalWords.length > maxWordsAllowed) {
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
    }`;

content = content.replace(target2, replacement2);

fs.writeFileSync('server/services/qaAuditAgent.ts', content);
