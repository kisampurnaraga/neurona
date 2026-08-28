const fs = require('fs');
let code = fs.readFileSync('src/components/VideoPreviewPlayer.tsx', 'utf8');

const targetStr = `  const [isSpeaking, setIsSpeaking] = useState(false);`;
const replaceStr = `  const [isSpeaking, setIsSpeaking] = useState(false);
  const [modelHealth, setModelHealth] = useState<'Pending' | 'Ready' | 'Failed' | 'Processing'>('Pending');

  useEffect(() => {
    let isMounted = true;
    const fetchDiagnostic = async () => {
      if (!videoModel) return;
      try {
        const res = await fetch('/api/admin/diagnostics/video-models');
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
             const key = videoModel.toLowerCase();
             let searchKey = key;
             if (key.includes('kling')) searchKey = 'kling';
             else if (key.includes('wan')) searchKey = 'wan';
             else if (key.includes('minimax')) searchKey = 'minimax';
             else if (key.includes('seedance') || key.includes('bytedance')) searchKey = 'seedance';
             else if (key.includes('luma')) searchKey = 'luma';
             else if (key.includes('hunyuan')) searchKey = 'hunyuan';
             else if (key.includes('veo')) searchKey = 'veo';

             const match = data.results.find((r: any) => r.model.toLowerCase().includes(searchKey));
             if (match) {
                setModelHealth(match.status === 'SUCCESS' ? 'Ready' : 'Failed');
             } else {
                setModelHealth('Ready');
             }
          }
        }
      } catch (e) {
         if (isMounted) setModelHealth('Failed');
      }
    };
    
    fetchDiagnostic();
  }, [videoModel]);`;

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replaceStr);
  fs.writeFileSync('src/components/VideoPreviewPlayer.tsx', code);
  console.log('Patched state and effect');
} else {
  console.log('Target string not found');
}
