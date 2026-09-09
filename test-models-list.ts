import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);

  console.log("=== CALLING models_explore action: 'list', type: 'image' ===");
  const imgRes = await (adapter as any).callMCPTool("models_explore", { action: "list", type: "image", limit: 50 });
  const imgText = imgRes?.content?.[0]?.text;
  console.log("Image models text:\n", imgText?.slice(0, 4000));

  console.log("\n=== CALLING models_explore action: 'list', type: 'video' ===");
  const vidRes = await (adapter as any).callMCPTool("models_explore", { action: "list", type: "video", limit: 50 });
  const vidText = vidRes?.content?.[0]?.text;
  console.log("Video models text:\n", vidText?.slice(0, 4000));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
