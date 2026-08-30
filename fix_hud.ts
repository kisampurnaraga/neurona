import fs from 'fs';
let content = fs.readFileSync('src/components/HolographicHudNode.tsx', 'utf8');

if (!content.includes('setClientConfig')) {
  content = content.replace(
    'const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);',
    'const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);\n  const [clientConfig, setClientConfig] = useState({ qaMinScoreThreshold: 70, qaAutoFixThreshold: 80 });\n\n  useEffect(() => {\n    fetch(\'/api/config/client\').then(r => r.json()).then(d => { if (d.qaMinScoreThreshold) setClientConfig(d); }).catch(console.error);\n  }, []);'
  );
}

fs.writeFileSync('src/components/HolographicHudNode.tsx', content);
