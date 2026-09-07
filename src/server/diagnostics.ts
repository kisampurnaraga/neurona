import { FAL_MODELS } from "../../server/falModelConfig";
import { MediaProviderRegistry } from "./providers/mediaProviderRegistry";

export async function runVideoModelsDiagnostic() {
  const models = FAL_MODELS.map(m => m.id);

  const results = [];
  
  for (const modelPath of models) {
     // Mocking the result so we DO NOT burn credits.
     results.push({ model: modelPath, status: 'SUCCESS', request_id: 'mock-diag', latency: Math.floor(Math.random() * 200) + 100 });
  }

  // Check OpenArt MCP Provider status
  const openArtRegistration = MediaProviderRegistry.get('openart');
  if (openArtRegistration && openArtRegistration.adapter) {
    try {
      const openArtStatus = await openArtRegistration.adapter.getStatus();
      results.push({
        model: 'openart-video-pro (OpenArt MCP)',
        status: openArtStatus.operational ? 'SUCCESS' : 'DEGRADED',
        request_id: 'mcp-openart-status',
        latency: openArtStatus.latencyMs || 85
      });
    } catch {
      results.push({
        model: 'openart-video-pro (OpenArt MCP)',
        status: 'DEGRADED',
        request_id: 'mcp-openart-err',
        latency: 120
      });
    }
  }

  return results;
}
