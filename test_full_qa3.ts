import { LLMService } from "./server/llmService";
import { QAAuditAgent, QAAuditInput } from "./server/services/qaAuditAgent";

async function run() {
  try {
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
    
    console.log("FINAL QA SCORE:", qaResult.score);
    console.log("PASSED:", qaResult.passed);
    console.log("ISSUES:", qaResult.issues);
    
  } catch (err) {
    console.error(err);
  }
}

run();
