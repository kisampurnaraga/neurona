const fs = require('fs');
let code = fs.readFileSync('server/orchestrator.ts', 'utf8');

code = code.replace(
  `  static async generateSceneVideo(id: string, sceneId: string) {
    const project = projects.get(id);
    if (!project || !project.storyboard) return;`,
  `  static async generateSceneVideo(id: string, sceneId: string) {
    console.log('[generateSceneVideo] called with id:', id, 'sceneId:', sceneId);
    const project = projects.get(id);
    console.log('[generateSceneVideo] project exists:', !!project, 'storyboard exists:', !!project?.storyboard);
    if (!project || !project.storyboard) return;`
);

fs.writeFileSync('server/orchestrator.ts', code);
