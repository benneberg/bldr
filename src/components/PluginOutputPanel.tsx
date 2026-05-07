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
  Share2,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PluginArtifact {
  id: string;
  type: "image" | "video" | "audio" | "text" | "json" | "diff";
  source: "mimo" | "ccc" | "openai" | "system";
  data: any;
  metadata: any;
  created_at: string | number;
  createdAt?: number;
}

export const PluginOutputPanel: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const [artifacts, setArtifacts] = useState<PluginArtifact[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'view' | 'info'>('view');
  const [showArtifactList, setShowArtifactList] = useState(true);

  const fetchArtifacts = async () => {
    try {
      if (!sessionId) return;
      const response = await fetch(`/api/inspector/artifacts?sessionId=${encodeURIComponent(sessionId)}`);
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server returned ${response.status}: ${text}`);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError: any) {
        throw new Error(`Failed to parse artifacts JSON: ${jsonError.message}`);
      }
      
      if (!Array.isArray(data)) {
        throw new Error(`Artifacts data is not an array: ${typeof data}`);
      }
      
      // Sanitize artifact data (especially for broken placeholder links)
      const sanitizedData = data.map((artifact: any) => {
        if (!artifact) return null;
        if (artifact.type === 'image' && typeof artifact.data === 'string') {
          // Map broken via.placeholder.com to placehold.co
          if (artifact.data.includes('via.placeholder.com')) {
            try {
              const match = artifact.data.match(/via\.placeholder\.com\/(\d+)(?:\/(\w+))?(?:\/(\w+))?(?:\?text=(.*))?/);
              if (match && match[1]) {
                const size = match[1] || '512';
                const text = match[4] || 'Image+Artifact';
                artifact.data = `https://placehold.co/${size}x${size}/111/fff?text=${text}`;
              } else {
                artifact.data = artifact.data.replace('via.placeholder.com', 'placehold.co');
              }
            } catch (regexError) {
              console.warn('[PluginOutput] Regex failure on artifact data:', regexError);
              artifact.data = artifact.data.replace('via.placeholder.com', 'placehold.co');
            }
          }
        }
        return artifact;
      }).filter(a => a !== null);
      
      setArtifacts(sanitizedData);
    } catch (error: any) {
      // Very detailed logging for the pattern mismatch error
      console.error('Failed to fetch artifacts:', {
        message: error.message,
        name: error.name,
        stack: error.stack,
        sessionId
      });
    }
  };

  useEffect(() => {
    fetchArtifacts();
    const interval = setInterval(fetchArtifacts, 5000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const selectedArtifact = artifacts.find(a => a.id === selectedArtifactId) || artifacts[0];

  const downloadArtifact = (artifact: PluginArtifact) => {
    const fileName = artifact.metadata.prompt 
      ? `${artifact.metadata.prompt.substring(0, 30).replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${artifact.id.substring(0, 5)}`
      : `artifact-${artifact.id.substring(0, 8)}`;
      
    const extension = artifact.type === 'image' ? 'png' : 
                     artifact.type === 'video' ? 'mp4' : 
                     artifact.type === 'audio' ? 'mp3' : 
                     artifact.type === 'json' ? 'json' : 'txt';

    const fullName = `${fileName}.${extension}`;

    // If data is a URL (likely for images/videos in this setup)
    if (typeof artifact.data === 'string' && (artifact.data.startsWith('http') || artifact.data.startsWith('blob:'))) {
      if (artifact.type === 'image' || artifact.type === 'video' || artifact.type === 'audio') {
        fetch(artifact.data, { mode: 'cors' })
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fullName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          })
          .catch(err => {
            console.error('Failed to download media via fetch, falling back to direct link:', err);
            const link = document.createElement('a');
            link.href = artifact.data as string;
            link.target = '_blank';
            link.download = fullName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          });
      } else {
        const link = document.createElement('a');
        link.href = artifact.data;
        link.download = fullName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // Create a blob for raw data
      const content = typeof artifact.data === 'string' ? artifact.data : JSON.stringify(artifact.data, null, 2);
      const mimeType = artifact.type === 'json' ? 'application/json' : 'text/plain';
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fullName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
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
          <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px]">
            <div className="relative group w-full h-full flex items-center justify-center bg-[#111] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
              <img 
                src={artifact.data} 
                alt={artifact.metadata.prompt}
                className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  console.error('Image failed to load:', artifact.data);
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('placehold.co')) {
                    target.src = `https://placehold.co/600x400/1a1a1a/666?text=Image+Unavailable`;
                  }
                }}
              />
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity lg:block hidden pointer-events-none">
                 <p className="text-[10px] text-gray-300 italic line-clamp-2">"{artifact.metadata.prompt}"</p>
              </div>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px] bg-black rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
            <video 
              controls 
              autoPlay
              muted
              loop
              className="max-w-full max-h-full"
              src={artifact.data}
              onError={(e) => {
                console.error('Video failed to load:', artifact.data);
              }}
            />
          </div>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center w-full h-full p-6 lg:p-10 bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-2xl">
            <div className="w-20 h-20 lg:w-32 lg:h-32 bg-purple-500/10 rounded-full flex items-center justify-center animate-pulse mb-8 border border-purple-500/20">
              <Headphones className="w-8 h-8 lg:w-16 lg:h-16 text-purple-400" />
            </div>
            <audio controls className="w-full max-w-md shadow-xl" src={artifact.data} />
          </div>
        );
      case 'json':
      case 'text':
        return (
          <div className="w-full h-full overflow-y-auto p-4 font-mono text-[11px] text-gray-300 bg-[#050505] border border-white/5 rounded-2xl shadow-inner scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex items-center gap-2 mb-4 text-gray-500 pb-2 border-b border-white/5">
               {artifact.type === 'json' ? <FileJson size={14}/> : <FileText size={14}/>}
               <span className="truncate text-[10px] uppercase tracking-widest">{artifact.id}</span>
            </div>
            <pre className="whitespace-pre-wrap leading-relaxed">{typeof artifact.data === 'string' ? artifact.data : JSON.stringify(artifact.data, null, 2)}</pre>
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 bg-[#0a0a0a] rounded-2xl border border-white/5 shadow-2xl">
            <Box className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-sm font-medium tracking-wide">Unsupported Artifact Format</p>
          </div>
        );
    }
  };

  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#050505] text-gray-600 gap-6 p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full" />
          <div className="relative p-6 rounded-3xl bg-[#0a0a0a] border border-white/5 shadow-2xl">
            <History className="w-12 h-12 opacity-20 text-purple-400" />
          </div>
        </div>
        <div className="text-center space-y-2 max-w-xs">
          <p className="text-sm font-bold text-gray-300 tracking-tight uppercase">No artifacts available</p>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Generate images, videos, or files via the AI assistant. Your results will appear here in real-time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#030303] text-white overflow-hidden font-sans">
      {/* Sidebar - Artifact List */}
      <AnimatePresence mode="wait">
        {(showArtifactList || window.innerWidth >= 1024) && (
          <motion.div 
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:w-[320px] w-full border-r border-white/5 flex flex-col bg-[#070707] z-30 lg:relative absolute inset-0 lg:inset-auto pb-[80px] lg:pb-0"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#0a0a0a]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-xl">
                  <Box size={16} className="text-purple-400 font-bold" />
                </div>
                <div>
                   <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-400">Inventory</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="lg:hidden p-2 hover:bg-white/10 rounded-full transition-colors bg-white/5 border border-white/10" onClick={() => setShowArtifactList(false)}>
                  <ChevronLeft size={20} className="text-gray-300" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {artifacts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setSelectedArtifactId(a.id);
                    if (window.innerWidth < 1024) setShowArtifactList(false);
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all text-left group relative overflow-hidden active:scale-[0.98] ${
                    selectedArtifact?.id === a.id 
                      ? 'bg-purple-600/10 border border-purple-500/30' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className={`p-3 rounded-2xl transition-all shrink-0 ${
                    selectedArtifact?.id === a.id ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'bg-white/5 text-gray-500 group-hover:text-gray-300'
                  }`}>
                    {a.type === 'image' && <ImageIcon size={20} />}
                    {a.type === 'video' && <Video size={20} />}
                    {a.type === 'audio' && <Headphones size={20} />}
                    {(a.type === 'text' || a.type === 'json' || a.type === 'diff') && <FileText size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[13px] font-black truncate leading-tight mb-1 ${selectedArtifact?.id === a.id ? 'text-white' : 'text-gray-400'}`}>
                       {a.metadata.prompt || a.type.toUpperCase()}
                    </div>
                    <div className="text-[9px] text-gray-600 font-mono">
                      {new Date(a.createdAt || a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Viewer Area */}
      <div className="flex-1 flex flex-col relative bg-[#030303] w-full min-w-0">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#080808]">
           <button 
             onClick={() => setShowArtifactList(true)}
             className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-white transition-colors tracking-widest"
           >
             <ChevronRight size={18} className="text-purple-500" />
             INVENTORY
           </button>
           <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                {selectedArtifact?.type}
              </span>
           </div>
        </div>

        {/* Unified Mobile-first Header with Sub-tabs */}
        <div className="flex flex-col lg:flex-row items-center justify-between lg:px-6 px-4 lg:h-20 py-3 lg:py-0 border-b border-white/5 bg-[#0a0a0a]/50 lg:backdrop-blur-3xl z-10 gap-3">
           <div className="flex gap-1.5 bg-black/50 p-1 rounded-2xl border border-white/5 w-full lg:w-auto">
             <button 
               onClick={() => setActiveSubTab('view')}
               className={`flex-1 lg:flex-none flex items-center justify-center gap-2 lg:px-8 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                 activeSubTab === 'view' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-gray-500 hover:text-gray-300'
               }`}
             >
               <Maximize2 size={13} />
               <span>View</span>
             </button>
             <button 
               onClick={() => setActiveSubTab('info')}
               className={`flex-1 lg:flex-none flex items-center justify-center gap-2 lg:px-8 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
                 activeSubTab === 'info' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40' : 'text-gray-500 hover:text-gray-300'
               }`}
             >
               <Info size={13} />
               <span>Details</span>
             </button>
           </div>

           <div className="flex gap-3 w-full lg:w-auto">
             <button 
               onClick={() => selectedArtifact && downloadArtifact(selectedArtifact)}
               className="flex-1 lg:flex-none flex items-center justify-center gap-3 lg:p-3 p-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/10 transition-all active:scale-95 group"
               title="Download Media"
             >
                <Download size={20} className="group-hover:text-purple-400 transition-colors" />
                <span className="lg:hidden text-[10px] font-black tracking-widest uppercase">Download</span>
             </button>
             <button 
               onClick={() => selectedArtifact && exportArtifact(selectedArtifact)}
               className="flex-1 lg:flex-none flex items-center justify-center gap-3 lg:p-3 p-4 bg-white/5 hover:bg-white/10 text-gray-300 rounded-2xl border border-white/10 transition-all active:scale-95 group"
               title="Export Metadata (JSON)"
             >
                <Share2 size={20} className="group-hover:text-purple-400 transition-colors" />
                <span className="lg:hidden text-[10px] font-black tracking-widest uppercase">Metadata</span>
             </button>
           </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 relative overflow-hidden">
           <AnimatePresence mode="wait">
             {activeSubTab === 'view' ? (
               <motion.div
                 key={`view-${selectedArtifact?.id}`}
                 initial={{ opacity: 0, scale: 0.98 }}
                 animate={{ opacity: 1, scale: 1 }}
                 exit={{ opacity: 0, scale: 1.02 }}
                 className="absolute inset-0 lg:p-12 p-6 flex items-center justify-center"
               >
                 {selectedArtifact && renderViewer(selectedArtifact)}
               </motion.div>
             ) : (
               <motion.div
                 key={`info-${selectedArtifact?.id}`}
                 initial={{ opacity: 0, x: 50 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -50 }}
                 className="absolute inset-0 lg:p-12 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5"
               >
                 <div className="max-w-5xl mx-auto space-y-12 lg:pb-0 pb-16">
                    <section className="space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-purple-500/10 rounded-lg">
                             <FileText size={18} className="text-purple-400" />
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500">Core Instruction</h4>
                       </div>
                       <div className="p-10 bg-[#070707] border border-white/5 rounded-[3rem] relative overflow-hidden group shadow-2xl">
                         <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-20 transition-all duration-700">
                            <Box size={240} className="rotate-12" />
                         </div>
                         <p className="text-xl lg:text-3xl leading-snug text-gray-100 font-bold relative z-10 tracking-tight">
                           {selectedArtifact?.metadata.prompt || 'Generated content via system protocol.'}
                         </p>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-500/10 rounded-lg">
                             <Activity size={18} className="text-gray-400" />
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500">Technical Context</h4>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <MetadataCard label="Engine" value={selectedArtifact?.source} highlight />
                          <MetadataCard label="Model" value={selectedArtifact?.metadata.model} />
                          <MetadataCard label="Latency" value={`${selectedArtifact?.metadata.executionTimeMs}ms`} />
                          <MetadataCard label="Format" value={selectedArtifact?.type} />
                          <MetadataCard label="Staged At" value={new Date(selectedArtifact?.createdAt || selectedArtifact?.created_at || 0).toLocaleString()} className="sm:col-span-2" />
                          <MetadataCard label="Reference" value={selectedArtifact?.id} mono className="sm:col-span-2" />
                       </div>
                    </section>

                    <section className="space-y-6">
                       <div className="flex items-center gap-4">
                          <div className="p-2 bg-gray-500/10 rounded-lg">
                             <FileJson size={18} className="text-gray-400" />
                          </div>
                          <h4 className="text-[11px] font-black uppercase tracking-[0.25em] text-gray-500">Structured Data</h4>
                       </div>
                       <div className="bg-black rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
                          <div className="flex items-center justify-between px-6 py-4 bg-[#0a0a0a] border-b border-white/5">
                             <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Artifact Metadata.json</span>
                             <button 
                               onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedArtifact?.metadata, null, 2))}
                               className="text-[9px] font-black uppercase bg-white/5 px-3 py-1 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
                             >
                               Copy JSON
                             </button>
                          </div>
                          <pre className="p-8 text-[11px] font-mono text-gray-500 overflow-x-auto leading-relaxed">
                            {JSON.stringify(selectedArtifact?.metadata, null, 2)}
                          </pre>
                       </div>
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

const MetadataCard = ({ label, value, mono = false, highlight = false, className = '' }: { label: string, value: any, mono?: boolean, highlight?: boolean, className?: string }) => (
  <div className={`p-6 bg-[#070707] border ${highlight ? 'border-purple-500/20 shadow-[0_4px_30px_rgba(168,85,247,0.08)]' : 'border-white/5'} rounded-3xl space-y-2 group transition-all hover:border-white/10 ${className}`}>
    <span className="text-[9px] text-gray-600 uppercase font-black tracking-[0.2em] block">{label}</span>
    <span className={`text-[14px] block truncate group-hover:text-white transition-colors ${highlight ? 'text-purple-400 font-black' : mono ? 'font-mono text-gray-400' : 'text-gray-300 font-bold'}`}>
      {value || 'N/A'}
    </span>
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

