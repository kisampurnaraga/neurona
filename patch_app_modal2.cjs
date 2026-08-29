const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add the import
if (!content.includes('CaptionStyleSelectorModal')) {
  content = content.replace(
    "import { neuronaVoice }",
    "import { CaptionStyleSelectorModal } from './components/CaptionStyleSelectorModal';\nimport { neuronaVoice }"
  );
}

// Add state
if (!content.includes('showCaptionModal')) {
  content = content.replace(
    "const [isFinalDashboardOpen, setIsFinalDashboardOpen] = useState(false);",
    "const [isFinalDashboardOpen, setIsFinalDashboardOpen] = useState(false);\n  const [showCaptionModal, setShowCaptionModal] = useState(false);"
  );
}

// Replace handleInteract("lanjut") in the banner
content = content.replace(
  /id="btn-approve-storyboard"\s+onClick=\{[^}]+\}\s+className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-indigo-500 hover:from-amber-300 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500\/20 flex items-center gap-1\.5 transition cursor-pointer"/,
  `id="btn-approve-storyboard"
                      onClick={() => setShowCaptionModal(true)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-indigo-500 hover:from-amber-300 hover:to-indigo-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition cursor-pointer"`
);

// Add modal render
if (!content.includes('<CaptionStyleSelectorModal')) {
  content = content.replace(
    "{/* Full Screen Loading Overlay */}",
    `{showCaptionModal && (
        <CaptionStyleSelectorModal 
          onSelect={(style) => {
            setShowCaptionModal(false);
            handleApprove(style);
          }} 
          onCancel={() => setShowCaptionModal(false)}
        />
      )}
      {/* Full Screen Loading Overlay */}`
  );
}

fs.writeFileSync('src/App.tsx', content);
