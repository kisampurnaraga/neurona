import sys

with open('src/server/fcc/FounderService.ts', 'r') as f:
    content = f.read()

# Add llmEngine to FounderService state
if "export type LlmEngineOption" not in content:
    content = content.replace("export type ImageEngineOption", "export type LlmEngineOption = 'gemini' | 'anthropic' | 'openai';\nexport type ImageEngineOption")
    content = content.replace("private static imageEngine: ImageEngineOption = 'chatgpt-image-2';", "private static imageEngine: ImageEngineOption = 'chatgpt-image-2';\n  private static llmEngine: LlmEngineOption = 'gemini';")
    
    # Add setLlmEngine method
    set_llm_engine_method = """
  static setLlmEngine(engine: LlmEngineOption) {
    this.llmEngine = engine;
    process.env.LLM_ENGINE = engine;
    this.auditLogs.push({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATE_LLM_ENGINE',
      target: 'SYSTEM',
      details: `Switched Default LLM Engine to ${engine}.`,
      status: 'SUCCESS'
    });
    return { success: true, engine: this.llmEngine };
  }
"""
    content = content.replace("static setImageEngine(engine: ImageEngineOption)", set_llm_engine_method + "\n  static setImageEngine(engine: ImageEngineOption)")
    
    # Include in getPlatformConfig
    content = content.replace("imageEngine: this.imageEngine,", "imageEngine: this.imageEngine,\n      llmEngine: this.llmEngine,")

    with open('src/server/fcc/FounderService.ts', 'w') as f:
        f.write(content)
    print("FounderService updated with LLM Engine support.")
