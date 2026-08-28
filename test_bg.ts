import { ProductionOrchestrator, loadProjects, saveProjects, projects } from './server/orchestrator.ts';
loadProjects();
console.log('Keys:', Array.from(projects.keys()));
