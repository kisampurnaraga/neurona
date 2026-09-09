import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);

  const imgRes = await (adapter as any).callMCPTool("models_explore", { action: "list", type: "image", limit: 100 });
  const imgParsed = JSON.parse(imgRes?.content?.[0]?.text || "{}");
  console.log("Total image models found:", imgParsed.items?.length);
  for (const item of (imgParsed.items || [])) {
    console.log(`- ID: "${item.id}" | Name: "${item.name}" | Provider: "${item.provider_name}" | Roles: ${JSON.stringify(item.medias?.[0]?.roles || [])} | AspectRatios: ${JSON.stringify(item.aspect_ratios?.slice(0, 4))}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
