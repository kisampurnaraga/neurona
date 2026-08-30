import fs from 'fs';
async function run() {
    let done = false;
    while (!done) {
        try {
            const resp = await fetch('http://localhost:3000/api/projects/80ecf007-3a7f-4cd0-984b-3629613d9f99');
            const data = await resp.json();
            if (data.storyboard && data.storyboard.isStoryboardCompleted) {
                console.log("Storyboard completed!");
                done = true;
            } else {
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch(e) {
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}
run();
