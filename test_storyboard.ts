import { LLMService } from "./server/llmService";

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
      onLog: (s, m, l) => console.log(`[${l}] ${s}: ${m}`)
    });
    
    console.log("\n--- RESULT SCENE 1 ---");
    const scene1 = result.data.storyboard_scenes[0];
    console.log("visualStyle:", scene1.visualStyle);
    console.log("promptImageToVideo:", scene1.promptImageToVideo);
    console.log("voiceover:", scene1.voiceover_script);
    
    const wordCount = scene1.voiceover_script.split(/\s+/).filter(Boolean).length;
    console.log(`VO Word Count: ${wordCount} words for duration ${scene1.duration}`);
    
  } catch (err) {
    console.error(err);
  }
}

run();
