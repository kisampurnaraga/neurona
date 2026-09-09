import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";
import { OpenArtMCPAdapter } from "./src/server/providers/OpenArtMCPAdapter";

async function run() {
  console.log("=== HIGGSFIELD MCP TEST ===");
  const higgsAdapter = new HiggsfieldMCPAdapter();
  try {
    const higgsTools = await higgsAdapter.discoverTools(true);
    console.log("Higgsfield Tools List Success:", higgsTools.success);
    console.log("Tools count:", higgsTools.toolsCount);
    const t2iTool = higgsTools.tools.find((t: any) => t.name.includes("image"));
    if (t2iTool) {
      console.log("EXACT T2I TOOL:", t2iTool.name);
      console.log("EXACT INPUT SCHEMA:", JSON.stringify(t2iTool.inputSchema, null, 2));
    } else {
      console.log("No T2I tool found in Higgsfield MCP.");
    }
  } catch (e) {
    console.error("Higgsfield Error:", e);
  }

  console.log("\n=== OPENART MCP TEST ===");
  const openArtAdapter = new OpenArtMCPAdapter();
  try {
    const openArtTools = await openArtAdapter.discoverTools(true);
    console.log("OpenArt Tools List Success:", openArtTools.success);
    console.log("Tools count:", openArtTools.toolsCount);
  } catch (e) {
    console.error("OpenArt Error:", e);
  }
  process.exit(0);
}

run();
