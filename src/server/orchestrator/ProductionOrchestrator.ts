import { StitcherAgent } from '../core/StitcherAgent.js';
import { resolveSceneSubtitle } from '../../../server/utils/subtitleUtils.js';
import { ProductionProject, ProductionState, AgentRun, AgentType, Storyboard } from '../../types/production.js';
import { eventBus, ProductionEvents } from '../core/EventBus.js';
import { randomUUID } from 'crypto';

// In-memory store for Phase 1
const projects = new Map<string, ProductionProject>();

export class ProductionOrchestrator {
  
  createProject(title: string, type: 'VIDEO' | 'IMAGE' | 'EBOOK' | 'STORY' | 'CUSTOM', userId: string, organizationId: string): ProductionProject {
    const project: ProductionProject = {
      id: randomUUID(),
      userId,
      organizationId,
      type,
      title,
      status: ProductionState.DRAFT,
      assets: [],
      agentRuns: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    projects.set(project.id, project);
    
    eventBus.emitEvent({
      type: ProductionEvents.CREATED,
      projectId: project.id,
      timestamp: new Date()
    });
    
    return project;
  }

  getProject(id: string): ProductionProject | undefined {
    return projects.get(id);
  }
  
  getAllProjects(): ProductionProject[] {
    return Array.from(projects.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  updateProjectStatus(id: string, newStatus: ProductionState) {
    const project = this.getProject(id);
    if (!project) throw new Error('Project not found');
    
    project.status = newStatus;
    project.updatedAt = new Date();
    projects.set(id, project);
  }

  recordAgentRunStart(projectId: string, agent: AgentType, stage: ProductionState): AgentRun {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');

    const run: AgentRun = {
      id: randomUUID(),
      projectId,
      agent,
      stage,
      status: 'RUNNING',
      startedAt: new Date()
    };
    
    project.agentRuns.push(run);
    project.updatedAt = new Date();
    return run;
  }
  
  recordAgentRunComplete(projectId: string, runId: string) {
    const project = this.getProject(projectId);
    if (!project) return;
    
    const run = project.agentRuns.find(r => r.id === runId);
    if (run) {
      run.status = 'COMPLETED';
      run.completedAt = new Date();
      run.duration = run.completedAt.getTime() - (run.startedAt?.getTime() || 0);
      project.updatedAt = new Date();
    }
  }

  // State Machine Transitions
  async startProduction(id: string, initialPrompt: string) {
    const project = this.getProject(id);
    if (!project) throw new Error('Project not found');
    
    this.updateProjectStatus(id, ProductionState.BRIEFING);
    eventBus.emitEvent({ type: ProductionEvents.STARTED, projectId: id, timestamp: new Date(), payload: { initialPrompt } });
    
    // Asynchronously kick off the agent chain
    this.runCreativeStrategist(project.id, initialPrompt).catch(err => {
      console.error('Failed in CreativeStrategist:', err);
      this.updateProjectStatus(id, ProductionState.FAILED);
    });
  }

  private async runCreativeStrategist(projectId: string, prompt: string) {
    const run = this.recordAgentRunStart(projectId, AgentType.CREATIVE_STRATEGIST, ProductionState.BRIEFING);
    
    // Simulate AI delay for creating brief
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const project = this.getProject(projectId)!;
    project.brief = {
      objective: prompt,
      targetAudience: 'General',
      product: 'Futuristic Sneaker',
      platform: 'TikTok',
      language: 'English',
      tone: 'Energetic',
      creativeAngle: 'Sci-fi reveal',
      duration: 15,
      aspectRatio: '9:16'
    };
    
    this.recordAgentRunComplete(projectId, run.id);
    eventBus.emitEvent({ type: ProductionEvents.BRIEF_CREATED, projectId, timestamp: new Date() });
    
    // Automatically proceed to storyboarding
    this.updateProjectStatus(projectId, ProductionState.STORYBOARDING);
    this.runStoryboardDirector(projectId).catch(err => console.error(err));
  }

  private async runStoryboardDirector(projectId: string) {
    const run = this.recordAgentRunStart(projectId, AgentType.STORYBOARD_DIRECTOR, ProductionState.STORYBOARDING);
    
    // Simulate AI delay for creating storyboard
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const project = this.getProject(projectId)!;
    project.storyboard = {
      id: randomUUID(),
      version: 1,
      approved: false,
      scenes: [
        {
          id: randomUUID(),
          duration: 3,
          objective: 'Hook the viewer',
          visualDescription: 'Macro shot of liquid metal forming a sole on a white laboratory surface. Cold lighting.',
          subject: 'Liquid Metal Sole',
          environment: 'White Lab',
          action: 'Forming',
          camera: 'Macro close up, slow pan',
          lighting: 'Cold, sterile',
          generationPrompt: 'Macro shot of liquid metal forming a sole on a white laboratory surface. Cold lighting.',
          status: 'PENDING'
        },
        {
          id: randomUUID(),
          duration: 5,
          objective: 'Show the tech',
          visualDescription: 'Neon blue light trails follow the movement as the sneaker accelerates through a grid-space.',
          subject: 'Sneaker',
          environment: 'Cyber Grid',
          action: 'Accelerating',
          camera: 'Tracking shot',
          lighting: 'Neon, dark',
          generationPrompt: 'Neon blue light trails follow the movement as the sneaker accelerates through a grid-space.',
          status: 'PENDING'
        }
      ]
    };
    
    this.recordAgentRunComplete(projectId, run.id);
    eventBus.emitEvent({ type: ProductionEvents.STORYBOARD_CREATED, projectId, timestamp: new Date() });
    
    // Wait for human approval
    this.updateProjectStatus(projectId, ProductionState.AWAITING_APPROVAL);
    eventBus.emitEvent({ type: ProductionEvents.STORYBOARD_APPROVAL_REQUIRED, projectId, timestamp: new Date() });
  }

  async approveStoryboard(projectId: string) {
    const project = this.getProject(projectId);
    if (!project) throw new Error('Project not found');
    if (project.status !== ProductionState.AWAITING_APPROVAL) throw new Error('Not awaiting approval');
    
    if (project.storyboard) {
      project.storyboard.approved = true;
      project.storyboard.approvedAt = new Date();
    }
    
    this.updateProjectStatus(projectId, ProductionState.PRODUCING);
    eventBus.emitEvent({ type: ProductionEvents.STORYBOARD_APPROVED, projectId, timestamp: new Date() });
    
    // Proceed to Video Generation
    this.runVideoDirector(projectId).catch(err => console.error(err));
  }

  private async runVideoDirector(projectId: string) {
    const run = this.recordAgentRunStart(projectId, AgentType.VIDEO_DIRECTOR, ProductionState.PRODUCING);
    const project = this.getProject(projectId)!;
    
    eventBus.emitEvent({ type: ProductionEvents.SCENE_GENERATION_STARTED, projectId, timestamp: new Date() });

    // Generate each scene using the configured video provider
    if (project.storyboard) {
      const { getVideoProvider } = await import('../providers/index.js');
      const provider = getVideoProvider();

      for (const scene of project.storyboard.scenes) {
        scene.status = 'GENERATING';
        project.updatedAt = new Date();
        
        try {
          const videoUrl = await provider.generateScene(scene as any, project.brief?.objective || '');
          scene.status = 'COMPLETED';
          scene.assetUrl = videoUrl;
          scene.videoUrl = videoUrl;
        } catch (error: any) {
          console.error(`Failed to generate scene with provider ${provider.name}:`, error);
          scene.status = 'FAILED';
          scene.assetUrl = (scene as any).imageUrl || undefined;
          scene.videoUrl = undefined;
        }
      }

      // Assign master cut
      const completedScenes = project.storyboard.scenes.filter(s => s.status === 'COMPLETED' && (s.videoUrl || s.assetUrl));
      if (completedScenes.length > 0) {
        try {
          const stitchInput = completedScenes.map((s, idx) => ({
            url: s.videoUrl || s.assetUrl || '',
            text: resolveSceneSubtitle(s, idx)
          }));
          project.finalVideoUrl = await StitcherAgent.stitchVideos(
            stitchInput, 
            project.brandLogoUrl, 
            project.extraVideoUrl,
            (project as any).subtitleStyle || 'Bold Pop'
          );
        } catch (e) {
          console.error("Stitch failed:", e);
          project.finalVideoUrl = undefined;
          this.updateProjectStatus(projectId, ProductionState.FAILED);
          eventBus.emitEvent({ type: ProductionEvents.FAILED, projectId, timestamp: new Date(), payload: { error: e } });
          return;
        }
      }
    }
    
    this.recordAgentRunComplete(projectId, run.id);
    eventBus.emitEvent({ type: ProductionEvents.SCENE_GENERATION_COMPLETED, projectId, timestamp: new Date() });
    
    // Complete production
    this.updateProjectStatus(projectId, ProductionState.COMPLETED);
    eventBus.emitEvent({ type: ProductionEvents.COMPLETED, projectId, timestamp: new Date() });
  }
}

export const orchestrator = new ProductionOrchestrator();
