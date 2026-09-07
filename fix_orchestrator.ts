import fs from 'fs';

let content = fs.readFileSync('server/orchestrator.ts', 'utf8');

// Find where it got cut off
const cutOffPattern = "            scene.status = 'GENERATING';\n}\n}\n";
if (content.endsWith(cutOffPattern) || content.endsWith("scene.status = 'GENERATING';\n}")) {
    console.log("Truncated exactly at scene.status = 'GENERATING';");
    content = content.replace(/scene\.status = 'GENERATING';[\s\S]*$/, "");
    content += `            if (scene.videoStatus !== 'COMPLETED') {
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
    fs.writeFileSync('server/orchestrator.ts', content, 'utf8');
} else {
    console.log("Could not find the expected cut-off pattern.");
}
