const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = `  app.post('/api/projects/:id/generate-scene-video', async (req, res) => {
    try {
      const { sceneId } = req.body;
      await ProductionOrchestrator.generateSceneVideo(req.params.id, sceneId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

const replaceStr = `  app.post('/api/projects/:id/generate-scene-video', async (req, res) => {
    try {
      const { sceneId } = req.body;
      // Do not await to avoid 504 timeouts on the frontend. The video generation takes minutes.
      // The frontend will poll the project state to see the updated videoUrl.
      ProductionOrchestrator.generateSceneVideo(req.params.id, sceneId).catch(err => {
         console.error('[BACKGROUND GENERATE VIDEO ERROR]', err);
      });
      res.json({ success: true, message: 'Video generation started in background.' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });`;

if (code.includes('await ProductionOrchestrator.generateSceneVideo')) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('server.ts', code);
  console.log('Successfully patched server.ts to not await generateSceneVideo');
} else {
  console.log('Target string not found in server.ts');
}
