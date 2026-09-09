import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);
  
  // Call models_explore for type: 'image'
  console.log("Calling models_explore with type: 'image'...");
  const client = (adapter as any).client;
  try {
    const res = await client.callTool({
      name: "models_explore",
      arguments: {
        type: "image"
      }
    });
    console.log("models_explore image result:", JSON.stringify(res, null, 2).slice(0, 4000));
  } catch (err: any) {
    console.error("models_explore error:", err.message);
  }

  // Also check generate_image schema details
  const t2i = (HiggsfieldMCPAdapter as any).cachedTools?.find((t: any) => t.name === "generate_image");
  console.log("generate_image inputSchema:", JSON.stringify(t2i?.inputSchema, null, 2));
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
