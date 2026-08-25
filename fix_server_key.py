import sys

with open('server.ts', 'r') as f:
    content = f.read()

chat_endpoint = """
  app.post('/api/neurona-chat', async (req, res) => {
    try {
      const customKey = req.headers['x-custom-api-key'] as string;
      if (customKey) process.env.GEMINI_MANUAL_API_KEY = customKey;
"""
content = content.replace("app.post('/api/neurona-chat', async (req, res) => {\n    try {", chat_endpoint)

tts_endpoint = """
  app.post('/api/tts', async (req, res) => {
    try {
      const customKey = req.headers['x-custom-api-key'] as string;
      if (customKey) process.env.GEMINI_MANUAL_API_KEY = customKey;
"""
content = content.replace("app.post('/api/tts', async (req, res) => {\n    try {", tts_endpoint)

with open('server.ts', 'w') as f:
    f.write(content)

print("Server patched for dynamic key")
