const fs = require('fs');
let content = fs.readFileSync('src/components/RenderGalleryModal.tsx', 'utf8');

const newImports = `import { X, Play, AlertTriangle, Download, Calendar, Trash2 } from 'lucide-react';`;
content = content.replace(`import { X, Play, AlertTriangle, Download, Calendar } from 'lucide-react';`, newImports);

const stateVars = `
  const [projects, setProjects] = useState<ProductionProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [projectToDelete, setProjectToDelete] = useState<ProductionProject | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
`;

content = content.replace(`  const [projects, setProjects] = useState<ProductionProject[]>([]);\n  const [loading, setLoading] = useState(true);`, stateVars);

const deleteLogic = `
  const handleDeleteClick = (e: React.MouseEvent, proj: ProductionProject) => {
    e.stopPropagation();
    if (proj.showcaseEligible) {
      alert('Project sedang dalam status Showcase. Nonaktifkan status Showcase di Founder Dashboard sebelum menghapus.');
      return;
    }
    setProjectToDelete(proj);
    setDeleteConfirmText('');
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(\`/api/projects/\${projectToDelete.id}\`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Gagal menghapus project');
      } else {
        setProjects(projects.filter(p => p.id !== projectToDelete.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };
`;

content = content.replace(`    fetchRenderedVideos();\n  }, []);`, `    fetchRenderedVideos();\n  }, []);\n\n` + deleteLogic);

const deleteButtonHTML = `
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(proj.updatedAt).toLocaleString('id-ID')}</span>
                      </div>
                      <button 
                        onClick={(e) => handleDeleteClick(e, proj)}
                        className="text-rose-500 hover:text-rose-400 flex items-center gap-1 p-1 hover:bg-rose-950/50 rounded transition"
                        title="Hapus Project"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
`;

content = content.replace(`<div className="flex items-center justify-between text-[10px] text-slate-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} />
                        <span>{new Date(proj.updatedAt).toLocaleString('id-ID')}</span>
                      </div>
                    </div>`, deleteButtonHTML);

const modalHTML = `
      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setProjectToDelete(null)} />
          <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/50 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-red-500"></div>
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 border border-rose-500/30 text-rose-500">
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="text-lg font-bold text-white">Hapus Project Permanen?</h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Semua gambar, video, dan naskah untuk project <strong className="text-white">"{projectToDelete.title || projectToDelete.brief}"</strong> akan dihapus dan <span className="text-rose-400 font-bold">TIDAK BISA</span> dikembalikan.
                </p>
                <div className="bg-rose-950/40 p-3 rounded-lg border border-rose-900/50 mt-2">
                  <p className="text-xs text-rose-300">
                    <strong>Peringatan:</strong> Kredit saldo yang sudah terpakai untuk project ini TIDAK akan di-refund.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="text-xs font-medium text-slate-400">Ketik "HAPUS" untuk konfirmasi:</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="HAPUS"
                className="w-full bg-slate-950 border border-slate-700 focus:border-rose-500 rounded-lg px-4 py-2 text-white outline-none"
              />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteConfirmText !== 'HAPUS' || isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center gap-2 transition cursor-pointer"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};`;

content = content.replace(/    <\/div>\n  \);\n};\s*$/, modalHTML);

fs.writeFileSync('src/components/RenderGalleryModal.tsx', content);
