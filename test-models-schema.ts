import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);
  const tools = (HiggsfieldMCPAdapter as any).cachedTools || [];
  const exploreTool = tools.find((t: any) => t.name === "models_explore");
  console.log("models_explore schema:", JSON.stringify(exploreTool, null, 2));

  // Let's call it via callMCPTool
  try {
    const res = await (adapter as any).callMCPTool("models_explore", { type: "image" });
    console.log("models_explore image raw:", JSON.stringify(res, null, 2).slice(0, 3000));
  } catch (e: any) {
    console.error("callMCPTool models_explore error:", e.message);
  }

  // Let's also check if there is a get_models or list_models tool
  const otherModelTools = tools.filter((t: any) => t.name.includes("model"));
  console.log("Model related tools:", otherModelTools.map((t: any) => t.name));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
