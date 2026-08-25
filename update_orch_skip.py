import sys

with open('server/orchestrator.ts', 'r') as f:
    content = f.read()

target = """            const sceneProgressPct = Math.round(55 + ((idx + 0.5) / total) * 20); // 55% to 75%
            project.overallProgress = sceneProgressPct;
            project.currentPhaseName = `GATOTKACA: Merender Video Adegan ${idx + 1}/${total} (${provider.name} - ${sceneProgressPct}%)`;
            updateTelemetry(project, 'GATOTKACA', { 
              status: 'ACTIVE', 
              currentTask: `Rendering scene ${idx + 1}/${total} (${scene.duration || '5s'})`, 
              progress: Math.round(((idx + 0.5) / total) * 100) 
            });
            appendLog(project, 'GATOTKACA', `RENDERING ADEGAN [${idx + 1}/${total}] via ${provider.name} -> Durasi: ${scene.duration}`, 'INFO');
            projectEvents.emit(`update:${id}`, project);
            
            const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType);
            scene.videoUrl = generatedUrl;
            scene.assetUrl = generatedUrl;
            scene.status = 'COMPLETED';
            scene.videoStatus = 'COMPLETED';"""

replacement = """            const sceneProgressPct = Math.round(55 + ((idx + 0.5) / total) * 20); // 55% to 75%
            project.overallProgress = sceneProgressPct;
            project.currentPhaseName = `GATOTKACA: Merender Video Adegan ${idx + 1}/${total} (${provider.name} - ${sceneProgressPct}%)`;
            updateTelemetry(project, 'GATOTKACA', { 
              status: 'ACTIVE', 
              currentTask: `Rendering scene ${idx + 1}/${total} (${scene.duration || '5s'})`, 
              progress: Math.round(((idx + 0.5) / total) * 100) 
            });
            
            if (scene.videoUrl && (scene.videoUrl.startsWith('http') || scene.videoUrl.startsWith('data:'))) {
                appendLog(project, 'GATOTKACA', `RE-USE ADEGAN [${idx + 1}/${total}] -> Menggunakan video hasil render terakhir.`, 'INFO');
                scene.status = 'COMPLETED';
                scene.videoStatus = 'COMPLETED';
            } else {
                appendLog(project, 'GATOTKACA', `RENDERING ADEGAN [${idx + 1}/${total}] via ${provider.name} -> Durasi: ${scene.duration}`, 'INFO');
                projectEvents.emit(`update:${id}`, project);
                
                const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType);
                scene.videoUrl = generatedUrl;
                scene.assetUrl = generatedUrl;
                scene.status = 'COMPLETED';
                scene.videoStatus = 'COMPLETED';
            }"""

if target in content:
    content = content.replace(target, replacement)
    with open('server/orchestrator.ts', 'w') as f:
        f.write(content)
    print("Updated orchestrator to reuse existing videos")
else:
    print("Target not found")
