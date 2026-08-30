import { QAAuditAgent } from './server/services/qaAuditAgent';

async function run() {
  const input = {
    productName: "Botol Minuman Ultra",
    videoPrompt: "A character holding Botol Minuman Ultra, close up, warm lighting",
    voiceoverScript: "Botol Minuman Ultra ini sangat tahan lama dan kuat sehingga tidak mudah pecah saat jatuh dari ketinggian.",
    durationSeconds: 3, // max ~6 words
    videoType: "AFFILIATE" as any,
    aspectRatio: "9:16" as any
  };

  const res = await QAAuditAgent.auditAndRefine(input);
  console.log("QA Score:", res?.score);
  console.log("Passed:", res?.passed);
  console.log("Issues:", res?.issues);
  console.log("Recommendations:", res?.recommendations);
  console.log("Corrected Script:", res?.correctedScript);
  console.log("Audit Notes:", res?.auditNotes);
}

run().catch(console.error);
