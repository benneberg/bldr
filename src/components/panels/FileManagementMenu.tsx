import React, { useState } from 'react';
import { 
  Plus, 
  Upload, 
  Download, 
  Github, 
  FileArchive, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FileManagementMenuProps {
  projectId: string;
  onImportSuccess: () => void;
}

export function FileManagementMenu({ projectId, onImportSuccess }: FileManagementMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleExport = () => {
    window.location.href = `/api/projects/${projectId}/export`;
  };

  const handleGitHubImport = async () => {
    const url = prompt('GitHub Repository URL:');
    const name = prompt('Service/Sub-project Name:');
    if (!url || !name) return;

    try {
      const res = await fetch('/api/import/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name, projectId })
      });
      if (res.ok) {
        onImportSuccess();
        alert('Repository imported successfully into workspace.');
      } else {
        const err = await res.json();
        alert('Import failed: ' + err.error);
      }
    } catch (e) {
      alert('Network error during import');
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const name = prompt('Workspace Name:', file.name.replace('.zip', ''));
    if (!name) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);

    try {
      const res = await fetch('/api/import/zip', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        window.location.hash = data.id; // Navigate to new project or stay if updating? 
        // For now let's just reload
        window.location.reload();
      }
    } catch (e) {
      alert('ZIP Upload failed');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-white/5 rounded-lg transition-colors flex items-center gap-2 text-mimo-text"
      >
        <FolderOpen className="w-5 h-5 text-mimo-accent" />
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest hidden sm:inline">Project</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-64 bg-mimo-panel border border-mimo-border rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-2 space-y-1">
                <div className="px-3 py-2 text-[8px] font-mono text-mimo-text-muted uppercase tracking-widest border-b border-mimo-border mb-1">
                  Workspace Management
                </div>
                
                <button 
                  onClick={handleGitHubImport}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-mimo-text transition-colors rounded-lg text-left"
                >
                  <Github className="w-4 h-4 text-mimo-accent" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Import from GitHub</span>
                    <span className="text-[9px] text-mimo-text-muted">Add repo to current workspace</span>
                  </div>
                </button>

                <label className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-mimo-text transition-all rounded-lg cursor-pointer">
                  <Upload className="w-4 h-4 text-mimo-accent" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Upload Files</span>
                    <span className="text-[9px] text-mimo-text-muted">Multi-file local upload</span>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files?.length) return;
                      const formData = new FormData();
                      Array.from(files).forEach((f: File) => formData.append('files', f));
                      try {
                        const res = await fetch(`/api/projects/${projectId}/upload`, {
                          method: 'POST',
                          body: formData
                        });
                        if (res.ok) onImportSuccess();
                      } catch (e) {
                        alert('Upload failed');
                      }
                    }} 
                    className="hidden" 
                  />
                </label>

                <label className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-mimo-text transition-all rounded-lg cursor-pointer">
                  <FileArchive className="w-4 h-4 text-mimo-accent" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Import from ZIP</span>
                    <span className="text-[9px] text-mimo-text-muted">Create new project from ZIP</span>
                  </div>
                  <input type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
                </label>

                <div className="my-1 border-t border-mimo-border" />

                <button 
                  onClick={handleExport}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-mimo-text transition-colors rounded-lg text-left"
                >
                  <Download className="w-4 h-4 text-mimo-accent" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Export Workspace</span>
                    <span className="text-[9px] text-mimo-text-muted">Download all files as .zip</span>
                  </div>
                </button>

                <button 
                  onClick={async () => {
                    setIsSyncing(true);
                    await fetch(`/api/projects/${projectId}/reset-sync`, { method: 'POST' });
                    setIsSyncing(false);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white/5 text-mimo-text transition-colors rounded-lg text-left"
                >
                  <RefreshCw className={`w-4 h-4 text-mimo-accent ${isSyncing ? 'animate-spin' : ''}`} />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold">Force Re-sync</span>
                    <span className="text-[9px] text-mimo-text-muted">Fix missing files in UI</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
