import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);
  const tools = (HiggsfieldMCPAdapter as any).cachedTools || [];
  const mediaTools = tools.filter((t: any) => t.name.includes("media") || t.name.includes("upload") || t.name.includes("import"));
  for (const t of mediaTools) {
    console.log(`Tool: ${t.name}\nSchema: ${JSON.stringify(t.inputSchema)}\n`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
