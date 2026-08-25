import sys

with open('server/orchestrator.ts', 'r') as f:
    content = f.read()

target = """            appendLog(project, 'GATOTKACA', `RENDERING ADEGAN [${idx + 1}/${total}] via ${provider.name} -> Durasi: ${scene.duration}`, 'INFO');
            projectEvents.emit(`update:${id}`, project);
            
            const generatedUrl = await provider.generateScene(scene as any, (project.brief || '') + ' TYPE:' + project.videoType);
            scene.videoUrl = generatedUrl;
            scene.assetUrl = generatedUrl;
            scene.status = 'COMPLETED';
            scene.videoStatus = 'COMPLETED';
            if (provider.isMock) {
               scene.metadata = { provider: 'mock', environment: 'development', synthetic: true };
            }

            appendLog(project, 'GATOTKACA', `ADEGAN [${idx + 1}/${total}] SELESAI DIRENDER OLEH ${provider.name} -> ${generatedUrl}`, 'SUCCESS');"""

replacement = """            
            if (scene.videoUrl && (scene.videoUrl.startsWith('http') || scene.videoUrl.startsWith('data:')) && !scene.videoUrl.includes('dummy')) {
                appendLog(project, 'GATOTKACA', `RE-USE ADEGAN [${idx + 1}/${total}] -> Memakai video hasil render terakhir.`, 'INFO');
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
                if (provider.isMock) {
                   scene.metadata = { provider: 'mock', environment: 'development', synthetic: true };
                }

                appendLog(project, 'GATOTKACA', `ADEGAN [${idx + 1}/${total}] SELESAI DIRENDER OLEH ${provider.name} -> ${generatedUrl}`, 'SUCCESS');
            }"""

if target in content:
    content = content.replace(target, replacement)
    with open('server/orchestrator.ts', 'w') as f:
        f.write(content)
    print("Updated orchestrator to reuse existing videos")
else:
    print("Target not found")
