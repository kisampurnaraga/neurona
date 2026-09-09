import { HiggsfieldMCPAdapter } from "./src/server/providers/HiggsfieldMCPAdapter";

async function main() {
  const adapter = new HiggsfieldMCPAdapter();
  await adapter.discoverTools(true);

  const mediaId = "36ad1b6f-ffc6-4186-9011-56274322e05b";
  console.log("Generating with reference image on soul_2...");
  const callRes = await (adapter as any).callMCPTool("generate_image", {
    params: {
      model: "soul_2",
      prompt: "The same woman smiling warmly in modern jacket outdoors in Tokyo",
      aspect_ratio: "1:1",
      medias: [
        { value: mediaId, role: "image" }
      ],
      count: 1
    }
  });
  console.log("Call result:", JSON.stringify(callRes, null, 2));

  const jobId = (adapter as any).extractJobId(callRes);
  if (jobId) {
    console.log("Job ID:", jobId);
    const assetUrl = await (adapter as any).waitForJob(jobId, 60);
    console.log("Reference Generated Image URL:", assetUrl);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
