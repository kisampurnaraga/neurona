import sys

with open('server.ts', 'r') as f:
    content = f.read()

import_statment = "app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));"

if "app.use('/outputs'" not in content:
    content = content.replace("app.get('/api/projects/:id/events', handleSse);", "app.get('/api/projects/:id/events', handleSse);\n\n  app.use('/outputs', express.static(path.join(process.cwd(), 'outputs')));")
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Added outputs static serving")
else:
    print("Already added")
