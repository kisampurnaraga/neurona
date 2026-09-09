import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);

  const testUrl = "https://d8j0ntlcm91z4.cloudfront.net/user_3J1NL91qVr5hwJ68oEfBqBxqiks/hf_20260909_120802_ff365182-c95a-49b3-b6b8-1e6a00887cf9.png";
  console.log("Importing test URL to Higgsfield MCP...");
  const importRes = await (adapter as any).callMCPTool("media_import_url", { url: testUrl, type: "image" });
  console.log("Import result:", JSON.stringify(importRes, null, 2));

  const importedId = importRes?.structuredContent?.media?.id || importRes?.id || importRes?.mediaId || importRes?.content?.[0]?.text;
  console.log("Imported ID:", importedId);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
