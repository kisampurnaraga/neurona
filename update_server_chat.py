import sys

with open('server.ts', 'r') as f:
    content = f.read()

import_line = "import { NeuronaChatService } from './server/neuronaChatService';\n"
if "NeuronaChatService" not in content:
    content = import_line + content

endpoint = """
  app.post('/api/neurona-chat', async (req, res) => {
    try {
      const { userId, message, history } = req.body;
      const response = await NeuronaChatService.chat(userId || 'default', message, history);
      res.json(response);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
"""

if "/api/neurona-chat" not in content:
    # Insert before app.get("/api/health")
    content = content.replace('app.get("/api/health"', endpoint + '\n  app.get("/api/health"')

with open('server.ts', 'w') as f:
    f.write(content)

print("Added /api/neurona-chat endpoint")
