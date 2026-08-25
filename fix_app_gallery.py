import sys

with open('src/App.tsx', 'r') as f:
    content = f.read()

import_statement = "import { GalleryModal } from './components/GalleryModal';\n"
if "GalleryModal" not in content:
    content = import_statement + content
    
    state_decl = "const [showGallery, setShowGallery] = useState(false);\n"
    content = content.replace("const [showFcc, setShowFcc] = useState(false);", "const [showFcc, setShowFcc] = useState(false);\n  " + state_decl)
    
    gallery_btn = """
          <button 
            onClick={() => setShowGallery(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900 text-cyan-300 transition cursor-pointer text-xs font-mono"
          >
            <Film size={14} />
            <span>GALERI</span>
          </button>
"""
    content = content.replace("onClick={() => setShowFcc(true)}", "onClick={() => setShowFcc(true)}")
    # Find FCC button and inject before it
    fcc_btn = """<button 
            onClick={() => setShowFcc(true)}"""
    content = content.replace(fcc_btn, gallery_btn + "          " + fcc_btn)
    
    # Inject modal
    modal_logic = """
      {showGallery && (
        <GalleryModal 
          onClose={() => setShowGallery(false)} 
          onSelectProject={(id) => {
             fetchProjectId(id);
             // switch view mode
             if (viewMode !== 'hud') setViewMode('hud');
          }} 
        />
      )}
"""
    content = content.replace("{showFcc && <FounderControlCenter onClose={() => setShowFcc(false)} />}", "{showFcc && <FounderControlCenter onClose={() => setShowFcc(false)} />}\n" + modal_logic)

    # Need a fetchProjectId helper
    fetch_helper = """
  const fetchProjectId = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        setActiveProjectId(data.id);
        setupEventSource(data.id);
      }
    } catch (e) {
      console.error("Failed to load project", e);
    }
  };
"""
    content = content.replace("const setupEventSource", fetch_helper + "\n  const setupEventSource")

    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("App.tsx updated with Gallery button.")

