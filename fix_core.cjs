const fs = require('fs');
let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

content = content.replace(
  "type HubState = 'IDLE' | 'THINKING' | 'WRITING' | 'STORYBOARDING' | 'READY';",
  "type HubState = 'IDLE' | 'THINKING' | 'WRITING' | 'STORYBOARDING' | 'READY' | 'COMPLETED';"
);

content = content.replace(
  "  let hubState: HubState = 'IDLE';\n  if (isThinking && !project) {",
  "  let hubState: HubState = 'IDLE';\n  if (project?.status === 'COMPLETED') {\n    hubState = 'COMPLETED';\n  } else if (isThinking && !project) {"
);

content = content.replace(
  "    } else if (project.status === 'AWAITING_APPROVAL') {",
  "    } else if (project.status === 'AWAITING_APPROVAL') {\n      // Hide the banner if the user has opened the storyboard\n      if (project.hasOpenedStoryboard) {\n        hubState = 'IDLE';\n      } else {\n        hubState = 'READY';\n      }"
);

// We need a way to track if the user opened the storyboard.
// Actually, I can just use a local state for the banner to be dismissable.
// Wait, is there a hasOpenedStoryboard? No.
