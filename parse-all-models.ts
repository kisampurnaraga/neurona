import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);

  const imgRes = await (adapter as any).callMCPTool("models_explore", { action: "list", type: "image", limit: 100 });
  const imgParsed = JSON.parse(imgRes?.content?.[0]?.text || "{}");
  console.log("=== ALL HIGGSFIELD IMAGE MODELS ===");
  for (const item of (imgParsed.items || [])) {
    console.log(`ID: "${item.id}" | Name: "${item.name}" | Provider: "${item.provider_name}" | Medias: ${JSON.stringify(item.medias)}`);
  }

  const vidRes = await (adapter as any).callMCPTool("models_explore", { action: "list", type: "video", limit: 100 });
  const vidParsed = JSON.parse(vidRes?.content?.[0]?.text || "{}");
  console.log("\n=== ALL HIGGSFIELD VIDEO MODELS ===");
  for (const item of (vidParsed.items || [])) {
    console.log(`ID: "${item.id}" | Name: "${item.name}" | Provider: "${item.provider_name}" | Medias: ${JSON.stringify(item.medias)}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
