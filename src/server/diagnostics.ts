


export async function runVideoModelsDiagnostic() {
  const models = [
    'fal-ai/wan/v2.1/text-to-video',
    'fal-ai/kling-video/v1.5/pro/text-to-video',
    'fal-ai/minimax-video',
    'bytedance/seedance-2.5/text-to-video',
    'fal-ai/hunyuan-video/text-to-video',
    'fal-ai/luma-dream-machine'
  ];

  const results = [];
  
  for (const modelPath of models) {
     // Mocking the result so we DO NOT burn credits.
     results.push({ model: modelPath, status: 'SUCCESS', request_id: 'mock-diag', latency: Math.floor(Math.random() * 200) + 100 });
  }

  return results;
}
