import { LLMService } from "./server/llmService";
import { QAAuditAgent } from "./server/services/qaAuditAgent";

async function run() {
  const result = await LLMService.generateStoryboard({
    brief: "Sepatu Aeroflex HyperRun V2, sepatu lari super ringan",
    videoType: "AFFILIATE",
    config: { productName: "Sepatu Aeroflex HyperRun V2" }
  });
  const scene1 = result.data.storyboard_scenes[0];
  console.log("SCENE 1:\n", scene1);
  
  const auditResult = (QAAuditAgent as any).runHeuristicAudit(
    { productName: "Sepatu Aeroflex HyperRun V2", videoType: "AFFILIATE", visualStyle: scene1.visualStyle },
    scene1.promptImageToVideo,
    scene1.voiceover_script,
    scene1.promptTextToImage,
    4,
    "9:16"
  );
  
  console.log("\nHEURISTIC AUDIT:");
  console.log(auditResult);
}
run();
