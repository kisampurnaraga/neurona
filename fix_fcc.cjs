const fs = require('fs');
let content = fs.readFileSync('src/FounderControlCenter.tsx', 'utf8');

// Replace { id: 'fal-ai/wan-i2v', label: 'Wan 2.1 (Budget - 720p)' }
content = content.replace(
  "{ id: 'fal-ai/wan-i2v', label: 'Wan 2.1 (Budget - 720p)' },", 
  `{ id: 'fal-ai/veo3.1/lite/image-to-video', label: 'Veo 3.1 Lite Bisu (Paling Murah)' },
                              { id: 'fal-ai/bytedance/seedance/v1/lite/image-to-video', label: 'Seedance 1.0 Lite (Budget Audio)' },
                              { id: 'fal-ai/wan-i2v', label: 'Wan 2.1 (Budget Klasik)' },`
);

content = content.replace(
  '<option value="fal-ai/wan-i2v" className="bg-[#1a1a1a] text-white py-2">\n                        fal-ai/wan-i2v (Wan 2.1 Standard 720p - Budget)\n                      </option>',
  `<option value="fal-ai/veo3.1/lite/image-to-video" className="bg-[#1a1a1a] text-white py-2">fal-ai/veo3.1/lite/image-to-video (Veo 3.1 Lite Bisu - Paling Murah)</option>
<option value="fal-ai/bytedance/seedance/v1/lite/image-to-video" className="bg-[#1a1a1a] text-white py-2">fal-ai/bytedance/seedance/v1/lite/image-to-video (Seedance 1.0 Lite - Budget)</option>
<option value="fal-ai/wan-i2v" className="bg-[#1a1a1a] text-white py-2">fal-ai/wan-i2v (Wan 2.1 Standard - Budget)</option>`
);

fs.writeFileSync('src/FounderControlCenter.tsx', content);
