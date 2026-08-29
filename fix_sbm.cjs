const fs = require('fs');

let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');
content = content.replace(
  `      const res = await fetch('/api/stitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, scenes: scenesPayload, subtitleStyle })
      });`,
  `      const res = await fetch(\`/api/projects/\${project.id}/stitch-master\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subtitleStyle })
      });`
);
fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
console.log('Fixed API call in component');
