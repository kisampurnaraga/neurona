import { LLMService } from "./server/llmService";
import { QAAuditAgent, QAAuditInput } from "./server/services/qaAuditAgent";

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
    const input: QAAuditInput = {
      voiceoverScript: scene1.voiceover_script,
      videoPrompt: scene1.promptImageToVideo || scene1.promptTextToImage,
      productName: "Sepatu Aeroflex HyperRun V2",
      aspectRatio: '9:16',
      durationSeconds: parseInt(scene1.duration) || 4,
      videoType: "AFFILIATE",
      visualStyle: scene1.visualStyle || 'ugc'
    };
    
    const qaResult = await QAAuditAgent.auditAndRefine(input);
    
    console.log("QA Score:", qaResult.overallScore);
    console.log("Passed Threshold:", qaResult.passedThreshold);
    console.log("Refined Video Prompt:", qaResult.refinedVideoPrompt);
    console.log("Refined VO Script:", qaResult.refinedVoiceoverScript);
    console.log("Details:", JSON.stringify(qaResult.breakdown, null, 2));
    
  } catch (err) {
    console.error(err);
  }
}

run();
