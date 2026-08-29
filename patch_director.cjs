const fs = require('fs');

let content = fs.readFileSync('src/components/NeuronaDirectorCore.tsx', 'utf8');

// 1. Add onResetProject to props
content = content.replace(
  '  userCredits?: number;\n}',
  '  userCredits?: number;\n  onResetProject?: () => void;\n}'
);

content = content.replace(
  '  userCredits = 37\n}) => {',
  '  userCredits = 37,\n  onResetProject\n}) => {'
);

// 2. Add COMPLETED to HubState and hasDismissedBanner state
content = content.replace(
  "  type HubState = 'IDLE' | 'THINKING' | 'WRITING' | 'STORYBOARDING' | 'READY';",
  "  type HubState = 'IDLE' | 'THINKING' | 'WRITING' | 'STORYBOARDING' | 'READY' | 'COMPLETED';\n  const [hasDismissedBanner, setHasDismissedBanner] = useState(false);"
);

// 3. Update hubState logic
content = content.replace(
  "  let hubState: HubState = 'IDLE';\n  if (isThinking && !project) {",
  "  let hubState: HubState = 'IDLE';\n  if (project?.status === 'COMPLETED') {\n    hubState = 'COMPLETED';\n  } else if (isThinking && !project) {"
);

// 4. Update showReadyBanner effect
content = content.replace(
  "    if (hubState === 'READY' && isStoryboardReady) {",
  "    if (hubState === 'READY' && isStoryboardReady && !hasDismissedBanner) {"
);

// 5. Add handleOpenStoryboard
content = content.replace(
  "  // Determine active production phase for live orbital nodes",
  "  const handleOpenStoryboard = () => {\n    setHasDismissedBanner(true);\n    setShowReadyBanner(false);\n    onOpenStoryboard();\n  };\n\n  // Determine active production phase for live orbital nodes"
);

// 6. Replace onOpenStoryboard with handleOpenStoryboard
content = content.split('onOpenStoryboard').join('handleOpenStoryboard');
// Wait, we need to leave the prop signature alone.
// Let's just fix it carefully with regex.

fs.writeFileSync('src/components/NeuronaDirectorCore.tsx', content);
