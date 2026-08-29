const fs = require('fs');
let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

content = content.replace(
  /  let hubState: HubState = 'IDLE';\n  if \(project\?\.status === 'COMPLETED'\) \{\n    hubState = 'COMPLETED';\n  \} else if \(isThinking && !project\) \{\n    hubState = 'THINKING';\n  \} else if \(project\?\.status === 'IN_PROGRESS' \|\| project\?\.status === 'AWAITING_APPROVAL'\) \{\n    if \(project\.currentStep === 'IDEA' \|\| project\.currentStep === 'ANALYZING'\) \{\n      hubState = 'THINKING';\n    \} else if \(project\.currentStep === 'SCRIPT_GENERATION'\) \{\n      hubState = 'WRITING';\n    \} else if \(project\.currentStep === 'SCENE_GENERATION' \|\| \(project\.progress && project\.progress >= 50 && project\.status !== 'AWAITING_APPROVAL'\)\) \{\n      hubState = 'STORYBOARDING';\n    \} else if \(project\.status === 'AWAITING_APPROVAL'\) \{\n      hubState = 'READY';\n    \} else \{\n      hubState = 'THINKING';\n    \}\n  \}/g,
  `  let hubState: HubState = 'IDLE';
  if (project?.status === 'COMPLETED') {
    hubState = 'COMPLETED';
  } else if (isThinking && !project) {
    hubState = 'THINKING';
  } else if (project) {
    if (project.status === 'FAILED') {
      hubState = 'IDLE';
    } else if (project.status === 'STORYBOARDING') {
      if (project.activeAgent === 'Creative Strategist') {
        hubState = 'THINKING';
      } else if (project.activeAgent === 'Storyboard Director') {
        // If progress is near 50 but not AWAITING_APPROVAL, it's storyboarding scenes
        if (project.overallProgress && project.overallProgress > 32) {
          hubState = 'STORYBOARDING';
        } else {
          hubState = 'WRITING';
        }
      } else {
        hubState = 'WRITING';
      }
    } else if (project.status === 'AWAITING_APPROVAL') {
      hubState = 'READY';
    } else if (project.status === 'PRODUCING' || project.status === 'ASSEMBLING' || project.status === 'AUDIO' || project.status === 'EDITING' || project.status === 'QA') {
      hubState = 'STORYBOARDING';
    } else {
      hubState = 'THINKING';
    }
  }`
);

fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', content);
