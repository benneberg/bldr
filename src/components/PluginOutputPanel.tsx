import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Image as ImageIcon, 
  Video, 
  Headphones, 
  FileJson, 
  FileText, 
  Download,
  Maximize2,
  ExternalLink,
  History,
  Info,
  ChevronLeft,
  ChevronRight,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PluginArtifact {
  id: string;
  type: "image" | "video" | "audio" | "text" | "json" | "diff";
  source: "mimo" | "ccc" | "openai" | "system";
  data: any;
  metadata: any;
  createdAt: number;
}

export const PluginOutputPanel: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [artifacts, setArtifacts] = useState<PluginArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'view' | 'info'>('view');
  const [showArtifactList, setShowArtifactList] = useState(true);

  const fetchArtifacts = async () => {
    try {
      const response = await fetch(`/api/inspector/artifacts?sessionId=${sessionId}`);
      const data = await response.json();
      setArtifacts(data);
    } catch (error) {
      console.error('Failed to fetch artifacts:', error);
    }
  };

  useEffect(() => {
    fetchArtifacts();
    const interval = setInterval(fetchArtifacts, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const selectedArtifact = artifacts.find(a => a.id === selectedArtifactId) || artifacts[0];

  const downloadArtifact = (artifact: PluginArtifact) => {
    const link = document.createElement('a');
    link.href = artifact.data;
    link.download = `artifact-${artifact.id}.${artifact.type === 'image' ? 'png' : artifact.type === 'video' ? 'mp4' : 'txt'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportArtifact = (artifact: PluginArtifact) => {
    const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `artifact-${artifact.id}-raw.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderViewer = (artifact: PluginArtifact) => {
    switch (artifact.type) {
      case 'image':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative group w-full h-full flex items-center justify-center">
              <img 
                src={artifact.data} 
                alt={artifact.metadata.prompt}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/5"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('Image failed to load:', artifact.data);
                  (e.target as HTMLImageElement).src = 'https://placehold.co/600x400/111/444?text=Image+Load+Error';
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg backdrop-blur-[2px]">
                 <p className="text-[10px] text-white/80 bg-black/60 px-3 py-1.5 rounded-full border border-white/10 uppercase tracking-widest font-bold">
                   {artifact.metadata.model}
                 </p>
              </div>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <video 
              controls 
              className="max-w-full max-h-full rounded-lg shadow-2xl"
              src={artifact.data}
            />
          </div>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-full p-4 lg:p-10">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse mb-8 border border-purple-500/30">
              <Headphones className="w-10 h-10 lg:w-16 lg:h-16 text-purple-400" />
            </div>
            <audio controls className="w-full max-w-md" src={artifact.data} />
          </div>
        );
      case 'json':
      case 'text':
        return (
          <div className="h-full overflow-y-auto p-4 font-mono text-[11px] text-gray-300 bg-[#050505] border border-white/5 rounded-lg shadow-inner">
            <div className="flex items-center gap-2 mb-4 text-gray-500 pb-2 border-b border-white/5">
               {artifact.type === 'json' ? <FileJson size={14}/> : <FileText size={14}/>}
               <span className="truncate">{artifact.id}</span>
            </div>
            <pre className="whitespace-pre-wrap">{typeof artifact.data === 'string' ? artifact.data : JSON.stringify(artifact.data, null, 2)}</pre>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Box className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm">Unknown artifact format</p>
          </div>
        );
    }
  };

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0a0a0a] text-gray-600 gap-4">
        <div className="p-4 rounded-full bg-[#111] border border-[#222] animate-pulse">
          <History className="w-10 h-10 opacity-20" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-gray-400">Waiting for artifacts...</p>
          <p className="text-[10px] mt-1 px-4">Generate images or videos in the chat to see them here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#030303] text-white overflow-hidden">
      {/* Artifact Sidebar/Header toggler for Mobile */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-white/5 bg-[#0a0a0a]">
         <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Gallery</span>
         </div>
         <button 
           onClick={() => setShowArtifactList(!showArtifactList)}
           className="p-1 px-3 bg-white/5 rounded-full text-[10px] border border-white/10"
         >
           {showArtifactList ? 'Hide List' : 'Show List'}
         </button>
      </div>

      {/* Sidebar - Artifact List */}
      <AnimatePresence>
        {(showArtifactList || window.innerWidth >= 1024) && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: window.innerWidth >= 1024 ? 280 : '100%', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/5 flex flex-col bg-[#080808] z-20 overflow-hidden lg:static absolute inset-0 lg:inset-auto"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">History</h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
                  {artifacts.length}
                </span>
                <button className="lg:hidden p-1" onClick={() => setShowArtifactList(false)}>
                  <ChevronLeft size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {artifacts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedArtifactId(a.id);
                    if (window.innerWidth < 1024) setShowArtifactList(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group ${
                    selectedArtifact?.id === a.id ? 'bg-purple-500/10 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.05)]' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-md transition-colors ${
                    selectedArtifact?.id === a.id ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'
                  }`}>
                    {a.type === 'image' && <ImageIcon size={16} />}
                    {a.type === 'video' && <Video size={16} />}
                    {a.type === 'audio' && <Headphones size={16} />}
                    {(a.type === 'text' || a.type === 'json' || a.type === 'diff') && <FileText size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium truncate leading-tight mb-1">
                       {a.metadata.prompt || a.type.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                       <span className={`text-[8px] uppercase px-1 rounded-sm ${
                         a.source === 'mimo' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-500/20 text-orange-400'
                       }`}>
                         {a.source}
                       </span>
                       <span className="text-[8px] text-gray-600 font-mono">
                         {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Viewer Area */}
      <div className="flex-1 flex flex-col relative bg-[#030303]">
        {/* Navigation / Tabs for Active Artifact */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 bg-[#0a0a0a]/50 backdrop-blur-xl">
           <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
             <button 
               onClick={() => setActiveSubTab('view')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                 activeSubTab === 'view' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'
               }`}
             >
               <Maximize2 size={12} />
               PREVIEW
             </button>
             <button 
               onClick={() => setActiveSubTab('info')}
               className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                 activeSubTab === 'info' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'text-gray-400 hover:text-white'
               }`}
             >
               <Info size={12} />
               DETAILS
             </button>
           </div>

           <div className="flex gap-2">
             <button 
               onClick={() => selectedArtifact && downloadArtifact(selectedArtifact)}
               className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-colors"
               title="Download Media"
             >
                <Download size={16} />
             </button>
             <button 
               onClick={() => selectedArtifact && exportArtifact(selectedArtifact)}
               className="p-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg border border-white/10 transition-colors"
               title="Export Raw Metadata"
             >
                <Share2 size={16} />
             </button>
           </div>
        </div>

        <div className="flex-1 relative overflow-hidden">
           <AnimatePresence mode="wait">
             {activeSubTab === 'view' ? (
               <motion.div
                 key={`view-${selectedArtifact?.id}`}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="absolute inset-0 p-4 lg:p-12"
               >
                 {selectedArtifact && renderViewer(selectedArtifact)}
               </motion.div>
             ) : (
               <motion.div
                 key={`info-${selectedArtifact?.id}`}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -10 }}
                 className="absolute inset-0 p-6 lg:p-12 overflow-y-auto"
               >
                 <div className="max-w-3xl mx-auto space-y-8">
                    <section>
                       <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-widest mb-4">Prompt Analysis</h4>
                       <div className="p-6 bg-white/5 border border-white/5 rounded-2xl italic text-lg leading-relaxed text-gray-300">
                         "{selectedArtifact?.metadata.prompt || 'No prompt recorded'}"
                       </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       <MetadataCard label="Source Engine" value={selectedArtifact?.source} />
                       <MetadataCard label="Model" value={selectedArtifact?.metadata.model || 'Auto'} />
                       <MetadataCard label="Execution" value={`${selectedArtifact?.metadata.executionTimeMs}ms`} />
                       <MetadataCard label="Artifact ID" value={selectedArtifact?.id} mono />
                       <MetadataCard label="Created" value={new Date(selectedArtifact?.createdAt || 0).toLocaleString()} />
                       <MetadataCard label="Type" value={selectedArtifact?.type.toUpperCase()} />
                    </div>

                    <section className="pt-4">
                       <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Raw Metadata</h4>
                       <pre className="p-4 bg-black border border-white/5 rounded-xl text-[10px] font-mono text-gray-500 overflow-x-auto">
                         {JSON.stringify(selectedArtifact?.metadata, null, 2)}
                       </pre>
                    </section>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const MetadataCard = ({ label, value, mono = false }: { label: string, value: any, mono?: boolean }) => (
  <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
    <span className="text-[8px] text-gray-500 uppercase font-bold block mb-1">{label}</span>
    <span className={`text-xs ${mono ? 'font-mono text-gray-400' : 'text-gray-200'}`}>{value || 'N/A'}</span>
  </div>
);

const Layers = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/>
    <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/>
    <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>
  </svg>
);

