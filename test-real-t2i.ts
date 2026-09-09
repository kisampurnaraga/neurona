import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);

  console.log("=== TESTING REAL T2I ON HIGGSFIELD MCP ===");
  try {
    const res = await adapter.generateImage({
      model: "soul_2",
      prompt: "A stunning cinematic portrait of an Indonesian woman with traditional batik modern dress",
      aspectRatio: "1:1"
    });
    console.log("T2I RESULT SUCCESS:", res);
  } catch (err: any) {
    console.error("T2I ERROR:", err.message);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
