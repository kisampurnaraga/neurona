const fs = require('fs');
let content = fs.readFileSync('src/components/FounderDashboard.tsx', 'utf8');

// Add Trash icon to imports
const newImports = `import { Database, Image as ImageIcon, Video, Bot, Users, Activity, LogOut, CheckCircle, Clock, Trash2, ArrowLeft, RefreshCw, Eye, History, AlertTriangle } from 'lucide-react';`;
content = content.replace(/import \{ .* \} from 'lucide-react';/, newImports);

// Add 'deleted' to activeTab
content = content.replace(`const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'gallery' | 'models' | 'audio'>('metrics');`, `const [activeTab, setActiveTab] = useState<'metrics' | 'users' | 'gallery' | 'models' | 'audio' | 'deleted'>('metrics');`);

const newTabs = `            <button
              onClick={() => setActiveTab('audio')}
              className={\`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition \${activeTab === 'audio' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}\`}
            >
              <Database size={18} />
              <span>Voice Library</span>
            </button>
            <button
              onClick={() => setActiveTab('deleted')}
              className={\`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium transition \${activeTab === 'deleted' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}\`}
            >
              <Trash2 size={18} />
              <span>Baru Dihapus</span>
            </button>`;

content = content.replace(/<button[^>]+onClick=\{\(\) => setActiveTab\('audio'\)\}[^>]+>[\s\S]+?<\/button>/, newTabs);

const deletedComponent = `
const DeletedProjectsTab = () => {
  const [deletedProjects, setDeletedProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDeleted = async () => {
    try {
      const res = await fetch('/api/projects/deleted');
      const data = await res.json();
      setDeletedProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const handleRestore = async (id: string) => {
    try {
      await fetch(\`/api/projects/\${id}/restore\`, { method: 'POST' });
      fetchDeleted();
    } catch (e) {
      console.error(e);
    }
  };

  const handleHardDelete = async (id: string) => {
    if (!confirm('Hapus permanen project ini dan semua filenya dari storage? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
      await fetch(\`/api/projects/\${id}/hard\`, { method: 'DELETE' });
      fetchDeleted();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-slate-400 p-6">Loading deleted projects...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Trash2 className="text-rose-400" /> Project Baru Dihapus
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          Project yang dihapus oleh user akan disembunyikan dan ditahan di sini selama 7 hari sebelum dihapus permanen dari storage bucket.
        </p>

        {deletedProjects.length === 0 ? (
          <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-800">
             <Trash2 size={40} className="mx-auto text-slate-700 mb-3" />
             <p className="text-slate-500 font-medium">Tidak ada project yang baru dihapus.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deletedProjects.map((p) => (
              <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 hover:border-slate-700 transition">
                <div className="flex-1">
                  <h4 className="font-bold text-white">{p.title || p.brief || 'Untitled Project'}</h4>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span>ID: {p.id}</span>
                    <span>Dihapus pada: {new Date(p.deletedAt).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleRestore(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition text-sm font-semibold flex items-center gap-1"
                  >
                    <RefreshCw size={14} /> Restore
                  </button>
                  <button 
                    onClick={() => handleHardDelete(p.id)}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition text-sm font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Hard Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
`;

content = content.replace(`export const FounderDashboard: React.FC<FounderDashboardProps> = ({ onClose }) => {`, deletedComponent + `\nexport const FounderDashboard: React.FC<FounderDashboardProps> = ({ onClose }) => {`);

const renderTab = `        {activeTab === 'gallery' && <FounderGallery />}
        {activeTab === 'models' && <ModelConfigDashboard />}
        {activeTab === 'audio' && <FounderAudioVoiceLibrary />}
        {activeTab === 'deleted' && <DeletedProjectsTab />}`;

content = content.replace(/\{activeTab === 'gallery' && <FounderGallery \/>\}\s*\{activeTab === 'models' && <ModelConfigDashboard \/>\}\s*\{activeTab === 'audio' && <FounderAudioVoiceLibrary \/>\}/, renderTab);

fs.writeFileSync('src/components/FounderDashboard.tsx', content);
