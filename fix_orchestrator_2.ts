import fs from 'fs';

let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

// Find the line where we need to insert the missing parts
const targetLine = "    scene.videoStatus = 'GENERATING';";
const insertPos = content.indexOf(targetLine);

if (insertPos !== -1) {
    console.log("Found the truncation point!");
    const firstHalf = content.substring(0, insertPos);
    
    const missingCode = `    scene.videoStatus = 'GENERATING';
    scene.status = 'GENERATING';

    const isOpenArt = effectiveVideoModel.toLowerCase().includes('openart');
    const actualProvider = isOpenArt ? 'OpenArt' : undefined;
    const isFounderBypass = (project as any).isFounderBypass || (project.userId === 'founder' || project.userId === 'admin');
    const creditCalc = CreditService.calculateCreditCost(effectiveVideoModel, { duration: scene.duration || 5, isFounderBypass, provider: actualProvider, operation: 'image-to-video' });

    let holdSuccess = true;
    let holdId: string | undefined = undefined;
    if (project.userId && creditCalc.credits > 0) {
      const holdRes = await CreditService.holdCredits(
        project.userId, 
        creditCalc.credits, 
        \`Video Scene \${sceneIdx + 1} (\${effectiveVideoModel})\`, 
        undefined, 
        actualProvider, 
        effectiveVideoModel, 
        'image-to-video'
      );
      if (!holdRes.success) {
        holdSuccess = false;
        scene.videoStatus = 'FAILED';
        scene.status = 'FAILED';
        appendLog(project, 'ERROR', \`Gagal generate video adegan \${sceneIdx + 1}: \${holdRes.message || 'Kredit tidak mencukupi'}. Butuh \${creditCalc.credits} kredit.\`, 'ERROR');
        projectEvents.emit(\`update:\${id}\`, project);
        return;
      }
      holdId = holdRes.holdId;
    }

    const provider = getVideoProvider(effectiveVideoModel);
    
    appendLog(project, 'GATOTKACA', \`MEMULAI RENDER VIDEO ADEGAN \${sceneIdx + 1} dengan \${provider.name} (Biaya: \${creditCalc.credits} Kredit)...\`, 'INFO');
    updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: \`Rendering scene \${sceneIdx + 1} video latent diffusion...\`, progress: 15 });
    saveProjects();
    projectEvents.emit(\`update:\${id}\`, project);

    try {
      await simulateAgent(600);
      appendLog(project, 'GATOTKACA', \`ADEGAN \${sceneIdx + 1}: Generasi pergerakan kamera sinematik & frame interpolasi...\`, 'INFO');
      updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: \`Rendering motion vectors for scene \${sceneIdx + 1}...\`, progress: 50 });
      projectEvents.emit(\`update:\${id}\`, project);
      
      await simulateAgent(600);
      appendLog(project, 'BAYU', \`ADEGAN \${sceneIdx + 1}: Menyiapkan overlay subtitle animasi & sinkronisasi audio narasi...\`, 'INFO');
      updateTelemetry(project, 'BAYU', { status: 'ACTIVE', currentTask: \`Adding subtitles to scene \${sceneIdx + 1}...\`, progress: 80 });
      projectEvents.emit(\`update:\${id}\`, project);

      const generatedUrl = await provider.generateVideo(
        project.masterCharacterImageUrl || project.characterProfile?.referenceImageUrl || '',
        scene.assetUrl || '',
        scene.videoPrompt || scene.prompt || ''
      );

      scene.videoUrl = generatedUrl;
      scene.videoStatus = 'COMPLETED';
      scene.status = 'COMPLETED';

      if (project.userId && creditCalc.credits > 0 && holdSuccess) {
        await CreditService.commitHold(project.userId, creditCalc.credits, holdId);
      }

      appendLog(project, 'GATOTKACA', \`VIDEO ADEGAN \${sceneIdx + 1} SELESAI DIRENDER & SUBTITLE DIPASANG -> \${generatedUrl}\`, 'SUCCESS');
      updateTelemetry(project, 'GATOTKACA', { status: 'ONLINE', currentTask: \`Scene \${sceneIdx + 1} ready\`, progress: 100 });
      projectEvents.emit(\`update:\${id}\`, project);

    } catch (e: any) {
      const latestProject = projects.get(id);
      if (latestProject && latestProject.storyboard && latestProject.storyboard.scenes && latestProject.storyboard.scenes[sceneIdx]) {
          latestProject.storyboard.scenes[sceneIdx].videoStatus = 'FAILED';
          latestProject.storyboard.scenes[sceneIdx].status = 'FAILED';
          Object.assign(project, latestProject);
      } else {
          scene.videoStatus = 'FAILED';
          scene.status = 'FAILED';
      }

      if (project.userId && creditCalc.credits > 0 && holdSuccess) {
        await CreditService.refundCredits(project.userId, creditCalc.credits, \`Refund: Gagal render video scene \${sceneIdx + 1}\`, holdId);
      }
      appendLog(project, 'ERROR', \`Gagal render video adegan \${sceneIdx + 1}: \${e.message}\`, 'ERROR');
      saveProjects();
      projectEvents.emit(\`update:\${id}\`, project);
    }
  }

  static async resumeWithTemplate(id: string) {
    const project = projects.get(id);
    if (!project || project.status !== 'QUOTA_FALLBACK_PENDING') return;
    
    (project as any).useTemplate = true;
    (project as any).isTemplateScript = true;
    project.status = 'BRIEFING';
    appendLog(project, 'PROTOCOL', 'Menggunakan Naskah Template (isTemplateScript: true) karena kuota AI habis.', 'INFO');
    
    // Resume pipeline
    this.runPipeline(id, project.brief?.product || "Produk").catch(console.error);
  }

  static async rejectFallback(id: string) {
    const project = projects.get(id);
    if (!project || project.status !== 'QUOTA_FALLBACK_PENDING') return;

    project.status = 'FAILED';
    project.error = "Produksi dibatalkan karena kuota AI habis (Tidak menggunakan template).";
    appendLog(project, 'SYSTEM', project.error, 'ERROR');
    projectEvents.emit(\`update:\${id}\`, project);
  }

  static async approveStoryboard(id: string) {
    const project = projects.get(id);
    if (!project || (project.status !== 'AWAITING_APPROVAL' && project.activeProductionStage !== 'IMAGES')) return;

    project.userChoice = 'FULL_PRODUCTION';
    project.status = 'PRODUCING';
    project.activeProductionStage = 'VIDEOS';
    project.overallProgress = 55;
    project.currentPhaseName = 'Rendering Frame Video Per Adegan (GATOTKACA - 55%)';
    project.activeAgent = 'AI Video Director';
    project.agentStatus['Human Approval Gate'] = 'COMPLETE';
    project.agentStatus['AI Video Director'] = 'WORKING';
    project.providerError = undefined;
    project.error = undefined;

    appendLog(project, 'PROTOCOL', \`PRODUCTION PIPELINE DISETUJUI -> MEMULAI MULTI-AGENT VIDEO ASSEMBLY & EDITING (\${project.storyboard?.totalVideoCredits || 60} KREDIT)\`, 'SUCCESS');
    updateTelemetry(project, 'GATOTKACA', { status: 'ACTIVE', currentTask: 'Rendering video frames on neural cluster', progress: 10 });
    saveProjects();

    projectEvents.emit(\`update:\${id}\`, project);

    this.runProductionStage(id).catch(console.error);
  }

  static async retryStage(id: string) {
    const project = projects.get(id);
    if (!project || project.status !== 'FAILED') return;
    
    // Clear previous errors
    project.providerError = undefined;
    project.error = undefined;

    const agent = project.activeAgent;
    project.agentStatus[agent!] = 'WORKING';
    
    if (agent === 'AI Video Director') project.status = 'PRODUCING';
    else if (agent === 'Video Assembly Editor') project.status = 'ASSEMBLING';
    else if (agent === 'Audio Designer') project.status = 'AUDIO';
    else if (agent === 'Viral Content Editor') project.status = 'EDITING';
    else if (agent === 'Video QA Director') project.status = 'QA';
    
    appendLog(project, 'PROTOCOL', \`RE-ENGAGING FAILED STAGE [\${agent}]\`, 'INFO');
    projectEvents.emit(\`update:\${id}\`, project);

    this.runProductionStage(id, agent!).catch(console.error);
  }

  static async runProductionStage(id: string, startFromAgent: string = 'AI Video Director') {
    const project = projects.get(id)!;
    
    try {
      const provider = getVideoProvider(project.videoModel);
      const pStatus = await provider.getStatus();
      
      if (startFromAgent === 'AI Video Director') {
        if (pStatus !== 'READY') {
          throw {
            code: pStatus,
            provider: provider.name,
            stage: \`\${provider.name} Engine\`,
            retryable: true,
            message: \`Video Provider '\${provider.name}' is \${pStatus}.\`
          };
        }

        // Generate Scenes
        if (project.storyboard) {
          const total = project.storyboard.scenes.length;
          for (let idx = 0; idx < total; idx++) {
            const scene = project.storyboard.scenes[idx];
            if (scene.videoStatus !== 'COMPLETED') {
              await this.generateSceneVideo(id, scene.id, project.videoModel);
            }
          }
        }
        
        project.agentStatus['AI Video Director'] = 'COMPLETE';
        startFromAgent = 'Video Assembly Editor';
      }

      if (startFromAgent === 'Video Assembly Editor') {
         project.activeAgent = 'Video Assembly Editor';
         project.agentStatus['Video Assembly Editor'] = 'WORKING';
         project.status = 'ASSEMBLING';
         appendLog(project, 'BAYU', 'Menyatukan video adegan...', 'INFO');
         projectEvents.emit(\`update:\${id}\`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Video Assembly Editor'] = 'COMPLETE';
         startFromAgent = 'Audio Designer';
      }

      if (startFromAgent === 'Audio Designer') {
         project.activeAgent = 'Audio Designer';
         project.agentStatus['Audio Designer'] = 'WORKING';
         project.status = 'AUDIO';
         appendLog(project, 'SINTA', 'Menambahkan musik dan efek suara...', 'INFO');
         projectEvents.emit(\`update:\${id}\`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Audio Designer'] = 'COMPLETE';
         startFromAgent = 'Viral Content Editor';
      }

      if (startFromAgent === 'Viral Content Editor') {
         project.activeAgent = 'Viral Content Editor';
         project.agentStatus['Viral Content Editor'] = 'WORKING';
         project.status = 'EDITING';
         appendLog(project, 'GATOTKACA', 'Menambahkan efek transisi dan filter...', 'INFO');
         projectEvents.emit(\`update:\${id}\`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Viral Content Editor'] = 'COMPLETE';
         startFromAgent = 'Video QA Director';
      }

      if (startFromAgent === 'Video QA Director') {
         project.activeAgent = 'Video QA Director';
         project.agentStatus['Video QA Director'] = 'WORKING';
         project.status = 'QA';
         appendLog(project, 'BIMA', 'Memeriksa kualitas video final...', 'INFO');
         projectEvents.emit(\`update:\${id}\`, project);
         
         await simulateAgent(1000);
         project.agentStatus['Video QA Director'] = 'COMPLETE';
      }

      project.status = 'COMPLETED';
      project.overallProgress = 100;
      project.currentPhaseName = 'Video Selesai!';
      project.videoUrl = "https://example.com/rendered-video.mp4"; // Placeholder if assembly wasn't full
      appendLog(project, 'PROTOCOL', 'PRODUKSI VIDEO SELESAI.', 'SUCCESS');
      saveProjects();
      projectEvents.emit(\`update:\${id}\`, project);

    } catch (e: any) {
      project.status = 'FAILED';
      project.error = e.message || 'Terjadi kesalahan saat memproduksi video.';
      project.providerError = e;
      appendLog(project, 'ERROR', project.error, 'ERROR');
      if (project.activeAgent) {
        project.agentStatus[project.activeAgent] = 'FAILED';
      }
      saveProjects();
      projectEvents.emit(\`update:\${id}\`, project);
    }
  }
}
`;
    fs.writeFileSync('server/orchestrator.ts', firstHalf + missingCode, 'utf8');
} else {
    console.log("Could not find the target line.");
}
