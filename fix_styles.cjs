const fs = require('fs');

// 1. Update App.tsx handleApprove to accept and send subtitleStyle
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
appContent = appContent.replace(
  'const handleApprove = async () => {',
  'const handleApprove = async (subtitleStyle?: string) => {'
);
appContent = appContent.replace(
  'await fetch(`/api/projects/${projectId}/approve`, { method: \'POST\' });',
  'await fetch(`/api/projects/${projectId}/approve`, { method: \'POST\', headers: {\'Content-Type\': \'application/json\'}, body: JSON.stringify({subtitleStyle}) });'
);
appContent = appContent.replace(
  'onApproveAndPay={() => {',
  'onApproveAndPay={(cost, subtitleStyle) => {'
);
appContent = appContent.replace(
  'handleApprove();',
  'handleApprove(subtitleStyle);'
);
fs.writeFileSync('src/App.tsx', appContent);


// 2. Update StoryboardMatrixModal Props to accept subtitleStyle
let sbmContent = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');
sbmContent = sbmContent.replace(
  'onApproveAndPay: (creditsCost: number) => void;',
  'onApproveAndPay: (creditsCost: number, subtitleStyle?: string) => void;'
);
sbmContent = sbmContent.replace(
  'onClick={() => onApproveAndPay(videoCreditsTotal)}',
  'onClick={() => onApproveAndPay(videoCreditsTotal, subtitleStyle)}'
);
sbmContent = sbmContent.replace(
  'onClick={() => onApproveAndPay(videoCreditsTotal)}',
  'onClick={() => onApproveAndPay(videoCreditsTotal, subtitleStyle)}'
);
sbmContent = sbmContent.replace(
  'onClick={() => onApproveAndPay(videoCreditsTotal)}',
  'onClick={() => onApproveAndPay(videoCreditsTotal, subtitleStyle)}'
); // replace multiple if present
fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', sbmContent);

// 3. Update server.ts /approve to read and store it
let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace(
  `  app.post('/api/projects/:id/approve', async (req, res) => {
    try {
      await ProductionOrchestrator.approveStoryboard(req.params.id);`,
  `  app.post('/api/projects/:id/approve', async (req, res) => {
    try {
      const { subtitleStyle } = req.body;
      const project = require('./server/orchestrator').projects.get(req.params.id);
      if (project) {
        project.subtitleStyle = subtitleStyle;
      }
      await ProductionOrchestrator.approveStoryboard(req.params.id);`
);
fs.writeFileSync('server.ts', serverContent);


// 4. Update src/shared/types.ts to include subtitleStyle
let typesContent = fs.readFileSync('src/shared/types.ts', 'utf8');
typesContent = typesContent.replace(
  'finalVideoUrl?: string;',
  'finalVideoUrl?: string;\n  subtitleStyle?: string;'
);
fs.writeFileSync('src/shared/types.ts', typesContent);


// 5. Update orchestrator.ts to read project.subtitleStyle
let orchContent = fs.readFileSync('server/orchestrator.ts', 'utf8');
orchContent = orchContent.replace(
  'const processResult = await VideoEditor.processProject(project, subtitleStyle);',
  'const processStyle = subtitleStyle || (project as any).subtitleStyle;\n      const processResult = await VideoEditor.processProject(project, processStyle);'
);
fs.writeFileSync('server/orchestrator.ts', orchContent);

console.log('Fixed all subtitle style passing');
