const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const routes = `
  // Soft Delete Project
  app.delete('/api/projects/:id', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    
    if (project.showcaseEligible) {
      return res.status(400).json({ success: false, error: "Project sedang dalam status Showcase. Nonaktifkan status Showcase di Founder Dashboard sebelum menghapus." });
    }

    project.status = 'deleted';
    project.deletedAt = new Date().toISOString();
    
    // Log audit
    const FounderService = require('./server/orchestrator').FounderService;
    if (FounderService && typeof FounderService.appendLog === 'function') {
      FounderService.appendLog(project, 'FOUNDER', \`User soft-deleted project \${project.id} (\${project.title})\`, 'WARN');
    }

    saveProjects();
    res.json({ success: true, message: "Project berhasil dipindahkan ke folder 'Baru Dihapus'." });
  });

  // Restore Project
  app.post('/api/projects/:id/restore', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    
    project.status = 'COMPLETED'; // or previous status
    delete project.deletedAt;
    
    const FounderService = require('./server/orchestrator').FounderService;
    if (FounderService && typeof FounderService.appendLog === 'function') {
      FounderService.appendLog(project, 'FOUNDER', \`User restored project \${project.id} (\${project.title})\`, 'SUCCESS');
    }

    saveProjects();
    res.json({ success: true, message: "Project berhasil dipulihkan." });
  });

  // Hard Delete Project
  app.delete('/api/projects/:id/hard', (req, res) => {
    const project = projects.get(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: "Project not found" });
    
    if (project.showcaseEligible) {
      return res.status(400).json({ success: false, error: "Project sedang dalam status Showcase. Tidak dapat dihapus permanen." });
    }

    // Attempt to delete local files associated with project
    try {
      const fsSync = require('fs');
      const path = require('path');
      if (project.finalVideoUrl && project.finalVideoUrl.startsWith('/outputs/')) {
         const filename = project.finalVideoUrl.replace('/outputs/', '');
         const filePath = path.join(process.cwd(), 'outputs', filename);
         if (fsSync.existsSync(filePath)) fsSync.unlinkSync(filePath);
      }
      if (project.storyboard && project.storyboard.scenes) {
         project.storyboard.scenes.forEach((s) => {
            if (s.videoUrl && s.videoUrl.startsWith('/outputs/')) {
               const filename = s.videoUrl.replace('/outputs/', '');
               const filePath = path.join(process.cwd(), 'outputs', filename);
               if (fsSync.existsSync(filePath)) fsSync.unlinkSync(filePath);
            }
            if (s.imageUrl && s.imageUrl.startsWith('/outputs/')) {
               const filename = s.imageUrl.replace('/outputs/', '');
               const filePath = path.join(process.cwd(), 'outputs', filename);
               if (fsSync.existsSync(filePath)) fsSync.unlinkSync(filePath);
            }
         });
      }
    } catch (e) {
      console.error("Error deleting local files:", e);
    }

    const FounderService = require('./server/orchestrator').FounderService;
    if (FounderService && typeof FounderService.appendLog === 'function') {
      FounderService.appendLog(project, 'FOUNDER', \`User hard-deleted project \${project.id} (\${project.title})\`, 'ERROR');
    }

    projects.delete(req.params.id);
    saveProjects();
    res.json({ success: true, message: "Project dan semua file terkait berhasil dihapus permanen." });
  });
`;

content = content.replace("app.get('/api/projects', (req, res) => {", routes + "\n  app.get('/api/projects', (req, res) => {");

// We also need to modify GET /api/projects to exclude deleted ones
content = content.replace("const allProjects = Array.from(projects.values());", "const allProjects = Array.from(projects.values()).filter((p: any) => p.status !== 'deleted');");

// Add a route to fetch deleted projects
const deletedRoute = `
  app.get('/api/projects/deleted', (req, res) => {
    const deletedProjects = Array.from(projects.values()).filter((p: any) => p.status === 'deleted');
    res.json(deletedProjects);
  });
`;

content = content.replace("app.get('/api/projects', (req, res) => {", deletedRoute + "\n  app.get('/api/projects', (req, res) => {");

fs.writeFileSync('server.ts', content);
