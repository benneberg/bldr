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
  History
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

  const renderViewer = (artifact: PluginArtifact) => {
    switch (artifact.type) {
      case 'image':
        return (
          <div className="relative group flex flex-col items-center justify-center h-full">
            <img 
              src={artifact.data} 
              alt={artifact.metadata.prompt}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="mt-4 p-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-center max-w-md">
              <p className="text-xs text-mimo-text-muted italic">"{artifact.metadata.prompt}"</p>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="relative flex flex-col items-center justify-center h-full">
            <video 
              controls 
              className="max-w-full max-h-[70%] rounded-lg shadow-2xl"
              src={artifact.data}
            />
            <div className="mt-4 p-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 text-center max-w-md">
              <p className="text-xs text-mimo-text-muted">Generated via {artifact.source} • {artifact.metadata.model}</p>
            </div>
          </div>
        );
      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center h-full p-10">
            <div className="w-32 h-32 bg-purple-500/20 rounded-full flex items-center justify-center animate-pulse mb-8 border border-purple-500/30">
              <Headphones className="w-16 h-16 text-purple-400" />
            </div>
            <audio controls className="w-full max-w-md" src={artifact.data} />
            <pre className="mt-6 text-[10px] font-mono text-gray-500 bg-black/30 p-4 rounded max-w-xl">
              {artifact.data}
            </pre>
          </div>
        );
      case 'json':
      case 'text':
        return (
          <div className="h-full overflow-y-auto p-4 font-mono text-[11px] text-gray-300 bg-[#050505] rounded-lg">
            <div className="flex items-center gap-2 mb-4 text-gray-500">
               {artifact.type === 'json' ? <FileJson size={14}/> : <FileText size={14}/>}
               <span>{artifact.id}</span>
            </div>
            <pre>{typeof artifact.data === 'string' ? artifact.data : JSON.stringify(artifact.data, null, 2)}</pre>
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
        <div className="p-4 rounded-full bg-[#111] border border-[#222]">
          <History className="w-10 h-10 opacity-20" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">No artifacts generated yet</p>
          <p className="text-[10px] mt-1">Prompt the AI to generate images, videos, or audio.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar - Artifact List */}
      <div className="w-64 border-r border-[#222] flex flex-col bg-[#0d0d0d]">
        <div className="p-4 border-b border-[#222] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Artifacts</h3>
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">
            {artifacts.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedArtifactId(a.id)}
              className={`w-full flex items-center gap-3 p-2 rounded-md transition-all text-left ${
                selectedArtifact?.id === a.id ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-[#151515] border border-transparent'
              }`}
            >
              <div className={`p-1.5 rounded ${
                selectedArtifact?.id === a.id ? 'bg-purple-500/20 text-purple-400' : 'bg-[#1a1a1a] text-gray-500'
              }`}>
                {a.type === 'image' && <ImageIcon size={14} />}
                {a.type === 'video' && <Video size={14} />}
                {a.type === 'audio' && <Headphones size={14} />}
                {(a.type === 'text' || a.type === 'json' || a.type === 'diff') && <FileText size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium truncate">
                   {a.metadata.prompt || a.type.toUpperCase()}
                </div>
                <div className="text-[9px] text-gray-600 font-mono">
                  {new Date(a.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Viewer */}
      <div className="flex-1 flex flex-col relative bg-[#050505]">
        <div className="absolute top-4 right-4 z-10 flex gap-2">
           <button className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors border border-white/5">
              <Download size={16} />
           </button>
           <button className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-colors border border-white/5">
              <Maximize2 size={16} />
           </button>
        </div>

        <div className="flex-1 p-8">
           <AnimatePresence mode="wait">
            <motion.div
              key={selectedArtifact?.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {selectedArtifact && renderViewer(selectedArtifact)}
            </motion.div>
           </AnimatePresence>
        </div>

        {/* Metadata Overlay */}
        {selectedArtifact && (
          <div className="p-4 border-t border-[#222] bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between">
            <div className="flex gap-6">
              <div>
                <span className="text-[9px] text-gray-500 uppercase block font-bold">Provider</span>
                <span className="text-[11px] text-purple-400">{selectedArtifact.source}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 uppercase block font-bold">Model</span>
                <span className="text-[11px] text-gray-300">{selectedArtifact.metadata.model || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-500 uppercase block font-bold">Latency</span>
                <span className="text-[11px] text-gray-300">{selectedArtifact.metadata.executionTimeMs}ms</span>
              </div>
            </div>
            <button className="flex items-center gap-2 text-[10px] text-gray-400 hover:text-white transition-colors">
              <ExternalLink size={12} />
              View raw data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
