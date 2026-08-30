import fs from 'fs';
let content = fs.readFileSync('server/llmService.ts', 'utf8');

const pacingRule = "1. PACING (CRITICAL LIMIT):";
const langRule = "0. LANGUAGE (CRITICAL): ALL Voiceovers and copy MUST BE IN INDONESIAN (BAHASA INDONESIA).\n";

if (!content.includes("0. LANGUAGE (CRITICAL):")) {
    content = content.replace(pacingRule, langRule + pacingRule);
    fs.writeFileSync('server/llmService.ts', content);
    console.log("Forced Indonesian for SINTA");
} else {
    console.log("Already forced.");
}
