import { LLMService } from "./server/llmService";
import { QAAuditAgent } from "./server/services/qaAuditAgent";

async function run() {
  try {
    console.log("Generating storyboard...");
    const result = await LLMService.generateStoryboard({
      brief: "Sepatu Aeroflex HyperRun V2, sepatu lari super ringan",
      videoType: "AFFILIATE",
      config: {
        productName: "Sepatu Aeroflex HyperRun V2",
        hookStyle: "PROBLEM_SOLVER",
        platform: "TikTok Shop"
      },
      onLog: () => {}
    });
    
    const scene1 = result.data.storyboard_scenes[0];
    console.log("\n--- GENERATED SCENE 1 ---");
    console.log("visualStyle:", scene1.visualStyle);
    console.log("promptImageToVideo:", scene1.promptImageToVideo);
    console.log("voiceover:", scene1.voiceover_script);
    
    console.log("\n--- RUNNING QA AUDIT ---");
    const qaResult = QAAuditAgent.auditScene(
      scene1.promptImageToVideo || scene1.promptTextToImage,
      scene1.voiceover_script,
      scene1.visualStyle || 'ugc',
      scene1.featuresProduct || false,
      "AFFILIATE",
      parseInt(scene1.duration) || 4,
      "9:16"
    );
    
    console.log("QA Score:", qaResult.score);
    console.log("Issues:", qaResult.issues);
    console.log("Recommendations:", qaResult.recommendations);
    
  } catch (err) {
    console.error(err);
  }
}

run();
