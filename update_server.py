import sys

with open('server.ts', 'r') as f:
    content = f.read()

old_block1 = """          console.log(`[Stitcher API] Processing full project merge for project ${projectId}...`);
          const finalUrl = await (await import('./server/VideoEditor')).VideoEditor.processProject(project);
          res.json({ success: true, url: finalUrl });"""

new_block1 = """          console.log(`[Stitcher API] Processing full project merge for project ${projectId}...`);
          const orchestrationResult = await (await import('./server/VideoEditor')).VideoEditor.processProject(project);
          res.json({ success: true, result: orchestrationResult, url: orchestrationResult.finalVideoUrl || orchestrationResult });"""

content = content.replace(old_block1, new_block1)

old_block2 = """  app.post('/api/projects/:id/stitch-master', async (req, res) => {
    try {
      const finalVideoUrl = await ProductionOrchestrator.stitchMasterVideo(req.params.id);
      res.json({ success: true, finalVideoUrl });
    } catch (e: any) {"""

new_block2 = """  app.post('/api/projects/:id/stitch-master', async (req, res) => {
    try {
      const result = await ProductionOrchestrator.stitchMasterVideo(req.params.id);
      res.json({ 
         success: true, 
         finalVideoUrl: typeof result === 'string' ? result : result.finalVideoUrl,
         orchestrationData: typeof result === 'string' ? null : result
      });
    } catch (e: any) {"""

content = content.replace(old_block2, new_block2)

with open('server.ts', 'w') as f:
    f.write(content)

print("Server.ts updated")
