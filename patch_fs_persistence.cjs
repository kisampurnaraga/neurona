const fs = require('fs');

const servicePath = 'src/server/fcc/FounderService.ts';
let code = fs.readFileSync(servicePath, 'utf8');

// Add fs import
if (!code.includes("import fs from 'fs';")) {
  code = code.replace(/import { randomUUID } from 'crypto';/, "import { randomUUID } from 'crypto';\nimport fs from 'fs';\nimport path from 'path';");
}

// Ensure the class loads config on init
const loadConfigRegex = /export class FounderService \{/;
const loadConfigStr = `export class FounderService {
  private static CONFIG_FILE = path.join(process.cwd(), '.neurona_config.json');

  private static loadConfig() {
    try {
      if (fs.existsSync(this.CONFIG_FILE)) {
        const data = JSON.parse(fs.readFileSync(this.CONFIG_FILE, 'utf8'));
        if (data.customFalConfig) this.customFalConfig = { ...this.customFalConfig, ...data.customFalConfig };
        if (data.customSoraConfig) this.customSoraConfig = { ...this.customSoraConfig, ...data.customSoraConfig };
        if (data.customVeoConfig) this.customVeoConfig = { ...this.customVeoConfig, ...data.customVeoConfig };
        if (data.customBytePlusConfig) this.customBytePlusConfig = { ...this.customBytePlusConfig, ...data.customBytePlusConfig };
        if (data.flags) this.flags = { ...this.flags, ...data.flags };
        
        // Update process.env based on loaded config
        if (this.customFalConfig.apiKey) process.env.FAL_KEY = this.customFalConfig.apiKey;
        if (this.customSoraConfig.apiKey) process.env.SORA_API_KEY = this.customSoraConfig.apiKey;
        if (this.customVeoConfig.apiKey) process.env.GEMINI_API_KEY = this.customVeoConfig.apiKey;
        if (this.customBytePlusConfig.apiKey) process.env.BYTEPLUS_API_KEY = this.customBytePlusConfig.apiKey;
      }
    } catch (e) {
      console.error('Failed to load neurona config:', e);
    }
  }

  private static saveConfig() {
    try {
      const data = {
        customFalConfig: this.customFalConfig,
        customSoraConfig: this.customSoraConfig,
        customVeoConfig: this.customVeoConfig,
        customBytePlusConfig: this.customBytePlusConfig,
        flags: this.flags
      };
      fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save neurona config:', e);
    }
  }

  // Load configuration immediately
  static {
    this.loadConfig();
  }
`;

if (!code.includes('private static loadConfig()')) {
  code = code.replace(loadConfigRegex, loadConfigStr);
}

// Make sure saveConfig is called in saveProviderConfig
if (!code.includes('this.saveConfig()')) {
  // Add this.saveConfig() before returning in saveProviderConfig
  code = code.replace(/return \{\s+success: true,\s+provider: providerId,/g, "this.saveConfig();\n      return {\n        success: true,\n        provider: providerId,");
  
  // For the specific fal, sora, veo return statements:
  code = code.replace(/return \{\s+success: true,\s+provider: 'fal',/g, "this.saveConfig();\n      return {\n        success: true,\n        provider: 'fal',");
  code = code.replace(/return \{\s+success: true,\s+provider: 'sora',/g, "this.saveConfig();\n      return {\n        success: true,\n        provider: 'sora',");
  code = code.replace(/return \{\s+success: true,\s+provider: 'veo',/g, "this.saveConfig();\n      return {\n        success: true,\n        provider: 'veo',");
  code = code.replace(/return \{\s+success: true,\s+provider: 'byteplus',/g, "this.saveConfig();\n      return {\n        success: true,\n        provider: 'byteplus',");
}

fs.writeFileSync(servicePath, code);
console.log('FounderService patched with fs persistence!');
