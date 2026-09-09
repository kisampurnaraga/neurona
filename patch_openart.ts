import fs from 'fs';

const path = 'src/server/providers/OpenArtMCPAdapter.ts';
let code = fs.readFileSync(path, 'utf8');

const target = `  private async waitForCreation(historyId: string, timeoutSeconds = 90, isVideo = false): Promise<string> {
    console.log(\`[OpenArt MCP] Awaiting creation completion (historyId: \${historyId}, isVideo: \${isVideo}, timeout: \${timeoutSeconds}s)...\`);`;

const replacement = `  private async waitForCreation(historyId: string, timeoutSeconds = 90, isVideo = false): Promise<string> {
    if (historyId === 'submit-failed' || historyId.includes('error') || historyId.includes('fail')) {
      throw new Error(\`OpenArt MCP Server gagal memproses permintaan (historyId: \${historyId}). Kemungkinan prompt melanggar kebijakan konten atau terjadi masalah pada server provider.\`);
    }
    console.log(\`[OpenArt MCP] Awaiting creation completion (historyId: \${historyId}, isVideo: \${isVideo}, timeout: \${timeoutSeconds}s)...\`);`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync(path, code);
    console.log("Patched successfully");
} else {
    console.log("Target not found");
}
