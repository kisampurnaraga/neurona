import fs from 'fs';
async function run() {
    const projId = '13e0b492-f701-4532-b806-b90cad827600';
    let done = false;
    while (!done) {
        try {
            const resp = await fetch(`http://localhost:3000/api/projects/${projId}`);
            const data = await resp.json();
            if (data.storyboard && data.storyboard.isStoryboardCompleted) {
                console.log("STORYBOARD COMPLETED!");
                const scenes = data.storyboard.scenes;
                scenes.forEach((s: any, idx: number) => {
                    console.log(`\n--- SCENE ${idx+1} ---`);
                    console.log(`PROMPT : ${s.promptTextToImage}`);
                    console.log(`VO     : ${s.correctedScript || s.voiceOver} (Words: ${(s.correctedScript || s.voiceOver).split(' ').length})`);
                    console.log(`QA     : ${s.qaScore}`);
                    console.log(`NOTES  : ${s.auditNotes || 'None'}`);
                });
                done = true;
            } else {
                console.log("Waiting... phase:", data.currentPhaseName);
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            console.log("Fetch error, retrying...");
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}
run();
