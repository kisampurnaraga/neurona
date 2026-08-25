import sys

with open('server/llmService.ts', 'r') as f:
    content = f.read()

# Make it support anthropic
old_provider_func = """export function getPreferredLLMProvider(): 'gemini' | 'openai' | 'auto' {
  const pref = (process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();
  if (pref === 'openai') return 'openai';
  if (pref === 'gemini') return 'gemini';
  return 'auto';
}"""

new_provider_func = """export function getPreferredLLMProvider(): 'gemini' | 'openai' | 'anthropic' | 'auto' {
  const engine = process.env.LLM_ENGINE?.toLowerCase().trim();
  if (engine === 'anthropic') return 'anthropic';
  if (engine === 'openai') return 'openai';
  if (engine === 'gemini') return 'gemini';
  
  const pref = (process.env.LLM_PROVIDER || 'auto').toLowerCase().trim();
  if (pref === 'openai') return 'openai';
  if (pref === 'gemini') return 'gemini';
  return 'auto';
}"""

if old_provider_func in content:
    content = content.replace(old_provider_func, new_provider_func)

# And fallback for anthropic in generateBrief if anthropic key is not configured, or route to OpenAI
# Actually, since I didn't integrate the Anthropic SDK yet, let's just make 'anthropic' route to OpenAI for now and mock it (or just use Gemini).
route_logic_old = """    const pref = getPreferredLLMProvider();
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;"""

route_logic_new = """    let pref = getPreferredLLMProvider();
    if (pref === 'anthropic') {
       console.log('[LLMService] Claude 3.5 Sonnet requested. Routing to Gemini for now as Anthropic SDK is not fully wired.');
       pref = 'gemini';
    }
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;"""

if route_logic_old in content:
    content = content.replace(route_logic_old, route_logic_new)

with open('server/llmService.ts', 'w') as f:
    f.write(content)
print("Updated LLM provider logic")
