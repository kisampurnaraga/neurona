import sys

with open('src/components/NeuronaAssistant.tsx', 'r') as f:
    content = f.read()

# Pass the custom api key in the request headers if available
chat_fetch = """
      const customKey = localStorage.getItem('neurona_gemini_api_key');
      const headers: any = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-custom-api-key'] = customKey;
      }
      
      const response = await fetch('/api/neurona-chat', {
        method: 'POST',
        headers,
"""
content = content.replace("const response = await fetch('/api/neurona-chat', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },", chat_fetch)

with open('src/components/NeuronaAssistant.tsx', 'w') as f:
    f.write(content)

with open('src/utils/speechSynthesis.ts', 'r') as f:
    tts_content = f.read()

tts_fetch = """
      const customKey = localStorage.getItem('neurona_gemini_api_key');
      const headers: any = { 'Content-Type': 'application/json' };
      if (customKey) {
        headers['x-custom-api-key'] = customKey;
      }
      
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers,
"""
tts_content = tts_content.replace("const res = await fetch('/api/tts', {\n        method: 'POST',\n        headers: { 'Content-Type': 'application/json' },", tts_fetch)

with open('src/utils/speechSynthesis.ts', 'w') as f:
    f.write(tts_content)

print("Assistant fetch patched")
