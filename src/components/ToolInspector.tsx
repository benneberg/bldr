import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Search, 
  Database, 
  Terminal, 
  Cpu, 
  FileCode, 
  GitBranch, 
  ChevronRight, 
  ChevronDown,
  Box,
  Image as ImageIcon,
  Video,
  FileText,
  Clock,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToolEvent {
  id: string;
  type: string;
  timestamp: number;
  payload: any;
  actor: string;
  category: string;
  metadata?: any;
  correlationId?: string;
}

export const ToolInspector: React.FC<{ projectId: string; sessionId?: string }> = ({ projectId, sessionId }) => {
  const [events, setEvents] = useState<ToolEvent[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const fetchEvents = async () => {
    try {
      const response = await fetch(`/api/debug/events?projectId=${projectId}`);
      const data = await response.json();
      setEvents(data.map((m: any) => ({
        ...m,
        payload: JSON.parse(m.payload),
        metadata: m.metadata ? JSON.parse(m.metadata) : {}
      })));
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [projectId]);

  const filteredEvents = events.filter(e => filter === 'ALL' || e.category === filter || e.type === filter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'AI_REQUEST': return <Cpu className="w-4 h-4 text-purple-400" />;
      case 'TOOL_INVOKE': return <Box className="w-4 h-4 text-blue-400" />;
      case 'FILE_UPDATED': return <FileCode className="w-4 h-4 text-green-400" />;
      case 'GIT_COMMIT_CREATED': return <GitBranch className="w-4 h-4 text-orange-400" />;
      case 'METRIC': return <Activity className="w-4 h-4 text-pink-400" />;
      case 'ARTIFACT_CREATED': return <ImageIcon className="w-4 h-4 text-cyan-400" />;
      default: return <Terminal className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white font-sans border-l border-[#222]">
      <div className="p-4 border-b border-[#222] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-500" />
          <h2 className="text-sm font-medium tracking-tight">Tool Inspector</h2>
        </div>
        <div className="flex gap-2">
          <select 
            className="bg-[#1a1a1a] border border-[#333] text-[10px] px-2 py-1 rounded outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="ALL">All Events</option>
            <option value="DOMAIN">Domain</option>
            <option value="AUDIT">Audit</option>
            <option value="METRIC">Metrics</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-1">
          {filteredEvents.map((event) => (
            <div key={event.id} className="group">
              <div 
                onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                className={`flex items-center gap-3 p-2 rounded-md transition-colors cursor-pointer ${
                  expandedId === event.id ? 'bg-[#1a1a1a]' : 'hover:bg-[#151515]'
                }`}
              >
                <div className="flex-shrink-0">
                  {getIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium truncate uppercase tracking-wider text-gray-400">
                      {event.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-gray-600 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                    {event.actor} • {event.id.slice(0, 8)}
                  </div>
                </div>
                {expandedId === event.id ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronRight className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100" />}
              </div>

              <AnimatePresence>
                {expandedId === event.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-[#111] mx-2 rounded-b-md border-x border-b border-[#222]"
                  >
                    <div className="p-3 space-y-3">
                      <div>
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Payload</span>
                        <pre className="mt-1 text-[10px] font-mono text-gray-300 bg-black/30 p-2 rounded max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {JSON.stringify(event.payload, null, 2)}
                        </pre>
                      </div>
                      
                      {Object.keys(event.metadata || {}).length > 0 && (
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold">Metadata</span>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {Object.entries(event.metadata).map(([k, v]) => (
                              <div key={k} className="flex gap-1 items-center bg-[#222] px-2 py-1 rounded text-[9px]">
                                <span className="text-gray-400">{k}:</span>
                                <span className="text-purple-300">
                                  {typeof v === 'number' ? `${v}ms` : String(v)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2 border-t border-[#222]">
                        <button className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 transition-colors">
                          <Play className="w-3 h-3" /> Replay
                        </button>
                        <button className="flex items-center gap-1 text-[9px] text-gray-500 hover:text-gray-400 transition-colors">
                          <Clock className="w-3 h-3" /> Causal Link
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 border-t border-[#222] bg-[#0c0c0c] flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Runtime: Active</span>
        </div>
        <div className="font-mono">
          {events.length} Events Total
        </div>
      </div>
    </div>
  );
};
