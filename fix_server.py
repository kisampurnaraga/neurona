import sys
import re

with open('server.ts', 'r') as f:
    content = f.read()

# Replace the /api/stitch endpoint
old_endpoint = """  app.post('/api/stitch', async (req, res) => {
    try {
      const scenes = req.body.scenes || (req.body.videoUrls ? req.body.videoUrls.map((url: string) => ({ url, text: '' })) : null);
      if (!scenes || !Array.isArray(scenes)) {
        return res.status(400).json({ error: 'scenes array is required.' });
      }
      
      console.log(`[Stitcher API] Received request to stitch ${scenes.length} videos`);
      const finalUrl = await StitcherAgent.stitchVideos(scenes);
      res.json({ success: true, url: finalUrl });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });"""

new_endpoint = """  app.post('/api/stitch', async (req, res) => {
    try {
      const { projectId, scenes } = req.body;
      if (projectId) {
          const project = projects.get(projectId);
          if (!project) return res.status(404).json({ error: 'Project not found.' });
          
          console.log(`[Stitcher API] Processing full project merge for project ${projectId}...`);
          const finalUrl = await (await import('./server/VideoEditor')).VideoEditor.processProject(project);
          res.json({ success: true, url: finalUrl });
      } else {
          if (!scenes || !Array.isArray(scenes)) {
            return res.status(400).json({ error: 'scenes array is required.' });
          }
          console.log(`[Stitcher API] Received request to stitch ${scenes.length} videos via basic Stitcher`);
          const finalUrl = await StitcherAgent.stitchVideos(scenes);
          res.json({ success: true, url: finalUrl });
      }
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });"""

if old_endpoint in content:
    content = content.replace(old_endpoint, new_endpoint)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Fixed server.ts stitch endpoint")
else:
    print("Failed to find server.ts stitch endpoint")

