import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  const res = await adapter.discoverTools(true);
  console.log("Success:", res.success, "Count:", res.toolsCount);
  for (const t of res.tools) {
    if (t.name.includes("model") || t.name.includes("catalog") || t.name.includes("image") || t.name.includes("generate")) {
      console.log(`Tool: ${t.name} - ${t.description?.slice(0, 100)}`);
    }
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
