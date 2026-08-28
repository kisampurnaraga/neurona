const fs = require('fs');
let code = fs.readFileSync('src/server/providers/index.ts', 'utf8');

if (!code.includes('FalVideoAdapter')) {
  code = code.replace('export * from \'./MockVideoProvider\';', 'export * from \'./MockVideoProvider\';\nexport * from \'./FalVideoAdapter\';');
  code = code.replace('import { VideoGenerationProvider } from "./VideoProvider";', 'import { VideoGenerationProvider } from "./VideoProvider";\nimport { FalVideoAdapter } from "./FalVideoAdapter";');
  
  const targetFn = `export function getVideoProvider(preferredType?: string): VideoGenerationProvider {
  const providerType = (preferredType || activeProviderType || process.env.VIDEO_PROVIDER || 'veo').toLowerCase();
  
  if (providerType.includes('veo') || providerType.includes('google') || providerType.includes('deepmind')) {`;
  
  const replacementFn = `export function getVideoProvider(preferredType?: string): VideoGenerationProvider {
  const providerType = (preferredType || activeProviderType || process.env.VIDEO_PROVIDER || 'veo').toLowerCase();
  
  if (providerType.includes('fal') || providerType.includes('hunyuan') || providerType.includes('wan') || providerType.includes('seedance') || providerType.includes('minimax') || providerType.includes('bytedance')) {
    return new FalVideoAdapter();
  }
  
  if (providerType.includes('veo') || providerType.includes('google') || providerType.includes('deepmind')) {`;
  
  code = code.replace(targetFn, replacementFn);
  
  fs.writeFileSync('src/server/providers/index.ts', code);
  console.log('Patched index.ts to include FalVideoAdapter');
}
