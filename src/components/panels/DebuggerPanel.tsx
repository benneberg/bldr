import React, { useState, useEffect } from 'react';
import { 
  History, 
  Database,
  ChevronRight, 
  Zap, 
  GitCommit, 
  FileCode, 
  AlertCircle, 
  MessageSquare,
  Clock,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DebugEvent } from '../../types';
import { Socket } from 'socket.io-client';

interface DebuggerPanelProps {
  projectId: string;
  socket: Socket | null;
}

export function DebuggerPanel({ projectId, socket }: DebuggerPanelProps) {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<DebugEvent | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await fetch(`/api/debug/events/${projectId}`);
      const data = await res.json();
      setEvents(data);
    };

    fetchEvents();

    if (socket) {
      socket.on('debug:event', (event: DebugEvent) => {
        setEvents(prev => [event, ...prev.slice(0, 99)]);
      });
      return () => {
        socket.off('debug:event');
      };
    }
  }, [projectId, socket]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'ai:action': return <Zap className="w-3 h-3 text-yellow-500" />;
      case 'git:commit': return <GitCommit className="w-3 h-3 text-purple-500" />;
      case 'git:import': return <Database className="w-3 h-3 text-green-500" />;
      case 'fs:change': return <FileCode className="w-3 h-3 text-blue-500" />;
      case 'runtime:error': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'runtime:log': return <MessageSquare className="w-3 h-3 text-mimo-text-muted" />;
      default: return <Clock className="w-3 h-3 text-mimo-text-muted" />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-mimo-bg text-mimo-text">
      <div className="p-4 border-b border-mimo-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-mimo-accent" />
          <h2 className="font-serif italic text-lg uppercase tracking-tight">Causal History</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              const res = await fetch('/api/debug/db');
              const data = await res.json();
              console.log('Database Debug:', data);
              alert('DB info printed to console');
            }}
            className="p-1.5 hover:bg-white/5 rounded-lg text-mimo-text-muted transition-all"
            title="Debug DB"
          >
            <Database className="w-4 h-4" />
          </button>
          <div className="text-[10px] font-mono text-mimo-text-muted uppercase">
            {events.length} Events Logged
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              layout
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              key={event.id}
              onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
              className={`
                p-3 rounded-lg border transition-all cursor-pointer group
                ${selectedEvent?.id === event.id 
                  ? 'bg-mimo-accent/10 border-mimo-accent shadow-lg' 
                  : 'bg-mimo-panel border-mimo-border hover:border-mimo-accent/40'}
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded bg-white/5`}>
                    {getEventIcon(event.type)}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                    {event.type.replace(':', ' ')}
                  </span>
                </div>
                <span className="text-[9px] font-mono text-mimo-text-muted">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="text-xs font-medium line-clamp-1 mb-1">
                {event.type === 'ai:action' && `Executed ${event.payload.action}`}
                {event.type === 'fs:change' && `FS: ${event.payload.event} at ${event.payload.path || 'Workspace'}`}
                {event.type === 'git:import' && `Imported ${event.payload.name}`}
                {event.type === 'runtime:error' && `${event.payload.message}`}
                {event.type === 'git:commit' && `Commit: ${event.gitRef.commit}`}
              </div>

              {selectedEvent?.id === event.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-mimo-accent/20 space-y-3 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-mono uppercase text-mimo-text-muted">
                    <div>
                      <div className="mb-0.5 opacity-50">Branch</div>
                      <div className="text-mimo-accent">{event.gitRef.branch}</div>
                    </div>
                    <div>
                      <div className="mb-0.5 opacity-50">Commit</div>
                      <div className="truncate">{event.gitRef.commit}</div>
                    </div>
                  </div>

                  {event.cccTier && (
                    <div className="flex items-center gap-2">
                       <span className="text-[9px] font-mono text-mimo-text-muted uppercase">Context Tier:</span>
                       <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                         event.cccTier === 1 ? 'bg-blue-500/20 text-blue-400' :
                         event.cccTier === 2 ? 'bg-purple-500/20 text-purple-400' :
                         'bg-red-500/20 text-red-400'
                       }`}>
                         TIER {event.cccTier}
                       </span>
                    </div>
                  )}

                  <div className="bg-black/20 p-2 rounded text-[10px] font-mono overflow-x-auto">
                    <pre>{JSON.stringify(event.payload, null, 2)}</pre>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 py-1.5 bg-mimo-accent text-mimo-bg text-[9px] font-mono uppercase font-bold rounded flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-95 transition-all">
                      <RotateCcw className="w-3 h-3" />
                      Time Travel
                    </button>
                    <button className="px-3 py-1.5 bg-white/5 border border-white/10 text-[9px] font-mono uppercase rounded hover:bg-white/10 transition-all flex items-center gap-1.5">
                      Causality <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
