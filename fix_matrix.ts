import fs from 'fs';
let content = fs.readFileSync('src/components/StoryboardMatrixModal.tsx', 'utf8');

if (!content.includes('onResetProject?: () => void;')) {
  content = content.replace(
    "onResyncScene?: (action: 'ADD' | 'REMOVE', targetIndex: number) => Promise<void>;",
    "onResyncScene?: (action: 'ADD' | 'REMOVE', targetIndex: number) => Promise<void>;\n  onResetProject?: () => void;"
  );
}

if (!content.includes('onResetProject,')) {
  content = content.replace(
    '  onResyncScene\n})',
    '  onResyncScene,\n  onResetProject\n})'
  );
}

if (!content.includes('Reset Proyek')) {
  content = content.replace(
    '<Download size={12} />\n                <span>JSON</span>\n              </button>',
    '<Download size={12} />\n                <span>JSON</span>\n              </button>\n              {onResetProject && (\n                <button\n                  onClick={() => {\n                    if (window.confirm("Apakah Anda yakin ingin menghapus Storyboard ini dan mengulang dari awal?")) {\n                      onResetProject();\n                      onClose();\n                    }\n                  }}\n                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-500/50 text-[11px] text-rose-300 transition cursor-pointer"\n                  title="Hapus Storyboard & Reset Proyek"\n                >\n                  <Trash2 size={12} />\n                  <span className="hidden sm:inline">Reset Proyek</span>\n                </button>\n              )}'
  );
}

// Add Trash2 to lucide-react imports if not present
if (!content.includes('Trash2')) {
  content = content.replace('RefreshCw\n} from', 'RefreshCw,\n  Trash2\n} from');
}

fs.writeFileSync('src/components/StoryboardMatrixModal.tsx', content);
