import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderCode, 
  MessageSquare, 
  Play, 
  Plus, 
  Github, 
  Loader2, 
  ChevronRight, 
  FileText, 
  Send,
  Database,
  ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY || '' });

// --- Types ---

interface Project {
  id: string;
  name: string;
  created_at: string;
}

interface FileEntry {
  path: string;
  size: number;
}

interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
  activities?: { name: string; args: any }[];
}

// --- Main App Component ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'preview'>('chat');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const res = await fetch('/api/projects');
    const data = await res.json();
    setProjects(data);
  };

  const handleImport = async (url: string, name: string) => {
    setIsImporting(true);
    try {
      const res = await fetch('/api/import/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, name })
      });
      const data = await res.json();
      if (data.id) {
        setSelectedProjectId(data.id);
        fetchProjects();
      }
    } finally {
      setIsImporting(false);
    }
  };

  if (!selectedProjectId) {
    return (
      <div className="min-h-screen bg-mimo-bg flex flex-col items-center p-6 text-mimo-text">
        <header className="w-full max-w-md text-center mb-12 mt-12">
          <div className="w-16 h-16 bg-mimo-bg border border-mimo-accent rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(242,125,38,0.2)]">
            <div className="w-4 h-4 bg-mimo-accent rounded-full animate-pulse" />
          </div>
          <h1 className="text-4xl font-serif italic tracking-tight mb-2">bldr</h1>
          <p className="text-mimo-text-muted text-sm font-mono uppercase tracking-widest">Dev Workspace</p>
        </header>

        <div className="w-full max-w-md space-y-6">
          {projects.length > 0 && (
            <div className="bg-mimo-panel rounded-xl shadow-2xl border border-mimo-border overflow-hidden">
              <div className="px-4 py-3 border-b border-mimo-border flex items-center gap-2 text-[10px] font-mono text-mimo-text-muted uppercase tracking-widest">
                <Database className="w-3 h-3 text-mimo-accent" />
                Persistent Workspaces
              </div>
              <div className="divide-y divide-mimo-border">
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProjectId(p.id)}
                    className="w-full px-4 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="flex flex-col items-start transition-transform group-active:scale-95">
                      <span className="font-medium text-mimo-text">{p.name}</span>
                      <span className="text-[10px] font-mono text-mimo-text-muted">{new Date(p.created_at).toLocaleDateString()}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-mimo-border group-hover:text-mimo-accent transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <ImportSection onImport={handleImport} isImporting={isImporting} />
        </div>
      </div>
    );
  }

  const activeProject = projects.find(p => p.id === selectedProjectId);

  return (
    <div className="flex flex-col h-screen bg-mimo-bg text-mimo-text overflow-hidden border-x border-mimo-border max-w-md mx-auto">
      {/* Header */}
      <header className="px-6 h-14 border-b border-mimo-border flex items-center justify-between bg-mimo-panel z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSelectedProjectId(null)}
            className="p-1 -ml-1 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <span className="font-serif italic text-lg leading-none">bldr</span>
            <span className="text-[10px] font-mono text-mimo-accent truncate max-w-[150px] leading-tight">● {activeProject?.name || 'Project'}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 bg-mimo-bg rounded border border-mimo-border text-[9px] font-mono text-mimo-text-muted">
            SYNCED
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden bg-mimo-bg">
        <AnimatePresence mode="wait">
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <ChatPanel projectId={selectedProjectId} />
            </motion.div>
          )}
          {activeTab === 'files' && (
            <motion.div 
              key="files"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <FilesPanel projectId={selectedProjectId} />
            </motion.div>
          )}
          {activeTab === 'preview' && (
            <motion.div 
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <PreviewPanel projectId={selectedProjectId} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Tabs */}
      <nav className="flex h-16 border-t border-mimo-border bg-mimo-panel safe-bottom shrink-0 px-4">
        <TabButton 
          active={activeTab === 'chat'} 
          onClick={() => setActiveTab('chat')} 
          icon={<MessageSquare />} 
          label="Chat" 
        />
        <TabButton 
          active={activeTab === 'files'} 
          onClick={() => setActiveTab('files')} 
          icon={<FolderCode />} 
          label="Files" 
        />
        <TabButton 
          active={activeTab === 'preview'} 
          onClick={() => setActiveTab('preview')} 
          icon={<Play />} 
          label="Preview" 
        />
      </nav>
    </div>
  );
}

// --- Subcomponents ---

function ImportSection({ onImport, isImporting }: { onImport: (url: string, name: string) => void, isImporting: boolean }) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="bg-mimo-panel rounded-xl shadow-2xl border border-mimo-border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-mimo-bg rounded-lg border border-mimo-border flex items-center justify-center">
          <Github className="text-mimo-accent w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif italic text-lg leading-tight">GitHub Import</h3>
          <p className="text-[10px] font-mono text-mimo-text-muted uppercase tracking-wider">Deterministic AI Sync</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-mono text-mimo-text-muted ml-2">REPOSITORY URL</label>
          <input 
            type="text" 
            placeholder="https://github.com/..." 
            className="w-full px-4 py-3 bg-mimo-bg border border-mimo-border rounded-lg focus:outline-none focus:border-mimo-accent transition-all text-sm font-mono text-mimo-text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-mono text-mimo-text-muted ml-2">WORKSPACE ID</label>
          <input 
            type="text" 
            placeholder="my-cool-project" 
            className="w-full px-4 py-3 bg-mimo-bg border border-mimo-border rounded-lg focus:outline-none focus:border-mimo-accent transition-all text-sm font-mono text-mimo-text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button 
          onClick={() => onImport(url, name)}
          disabled={!url || isImporting}
          className="w-full py-4 bg-mimo-accent text-mimo-bg rounded-full font-bold uppercase text-xs tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Create Sandbox'}
        </button>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${active ? 'text-mimo-accent' : 'text-mimo-text-muted'}`}
    >
      <div className={`p-2 transition-colors`}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-[0.15em] transition-all ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
      {active && <motion.div layoutId="tab-underline" className="w-1 h-1 bg-mimo-accent rounded-full mt-1" />}
    </button>
  );
}

function ChatPanel({ projectId }: { projectId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activities, setActivities] = useState<{name: string, args: any}[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [focusRepoId, setFocusRepoId] = useState<string>('all');
  const [dryRunEnabled, setDryRunEnabled] = useState(false);
  const [pendingWrite, setPendingWrite] = useState<{ call: any, resolve: (approved: boolean) => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRepos = async () => {
      const res = await fetch(`/api/projects/${projectId}/repositories`);
      const data = await res.json();
      setRepos(data);
    };
    fetchRepos();
  }, [projectId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, activities]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', parts: [{ text: input }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setActivities([]);

    try {
      const contents: any[] = messages.map(m => ({ 
        role: m.role, 
        parts: m.parts 
      }));
      contents.push({ role: 'user', parts: [{ text: input }] });

      // Add project context if it's the first message
      if (messages.length === 0) {
        try {
          const ctxRes = await fetch(`/api/tools/read_file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, path: 'WORKSPACE.md' })
          });
          const ctxData = await ctxRes.json();
          
          const llmRes = await fetch(`/api/tools/read_file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, path: 'LLM.md' })
          });
          const llmData = await llmRes.json();

          const pkmlRes = await fetch(`/api/tools/read_file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, path: 'PKML.md' })
          });
          const pkmlData = await pkmlRes.json();

          let fullContext = '';
          if (ctxData.content) fullContext += `### WORKSPACE OVERVIEW\n${ctxData.content}\n\n`;
          if (llmData.content) fullContext += `### ARCHITECTURAL CONVENTIONS (LLM.md)\n${llmData.content}\n\n`;
          if (pkmlData.content) fullContext += `### PRODUCT KNOWLEDGE (PKML.md)\n${pkmlData.content}\n\n`;

          if (fullContext) {
            contents[0].parts.unshift({ text: `bldr SYSTEM CONTEXT (CCC + PKML Mode):\n\n${fullContext}\n--- USER GOAL ---` });
          }
        } catch (e) {
          // Ignore if WORKSPACE.md doesn't exist
        }
      }

      const tools = [{
        functionDeclarations: [
          {
            name: 'read_file',
            description: 'Read the content of a file',
            parameters: {
              type: Type.OBJECT,
              properties: { path: { type: Type.STRING } },
              required: ['path']
            }
          },
          {
            name: 'write_file',
            description: 'Write or overwrite a file with content',
            parameters: {
              type: Type.OBJECT,
              properties: { 
                path: { type: Type.STRING },
                content: { type: Type.STRING }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'list_files',
            description: 'List all files in the project',
            parameters: { type: Type.OBJECT, properties: {} }
          },
          {
            name: 'align_check',
            description: 'Check if a proposed change aligns with architecture (LLM.md) and product knowledge (PKML.md)',
            parameters: {
              type: Type.OBJECT,
              properties: { 
                requirement: { type: Type.STRING, description: 'The change or feature being proposed' } 
              },
              required: ['requirement']
            }
          },
          {
            name: 'generate_pkml',
            description: 'Generate or update a PKML.md file with product knowledge inferred from the code',
            parameters: {
              type: Type.OBJECT,
              properties: { 
                content: { type: Type.STRING, description: 'New PKML markdown content' } 
              },
              required: ['content']
            }
          },
          {
            name: 'analyze_file',
            description: 'Read and perform a heuristic analysis of a file to determine purpose and quality',
            parameters: {
              type: Type.OBJECT,
              properties: { 
                path: { type: Type.STRING, description: 'Path to the file to analyze' } 
              },
              required: ['path']
            }
          }
        ]
      }];

      let result = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: { tools: tools as any }
      });

      let iteration = 0;
      const MAX_ITERATIONS = 10;
      let lastResponse = result;
      let currentActivities: any[] = [];

      while (lastResponse.candidates?.[0]?.content?.parts?.some(p => p.functionCall) && iteration < MAX_ITERATIONS) {
        const functionCalls = lastResponse.candidates[0].content.parts.filter(p => p.functionCall);
        const toolResponses: any[] = [];
        
        for (const part of functionCalls) {
          const call = part.functionCall!;
          
          // Dry Run Interception
          if (dryRunEnabled && (call.name === 'write_file' || call.name === 'replace_in_file')) {
            const approved = await new Promise<boolean>((resolve) => {
              setPendingWrite({ call, resolve });
            });
            setPendingWrite(null);
            if (!approved) {
              toolResponses.push({
                role: 'function',
                name: call.name,
                content: JSON.stringify({ error: 'User rejected the code modification.' })
              });
              continue;
            }
          }

          const act = { name: call.name, args: call.args };
          currentActivities.push(act);
          setActivities([...currentActivities]);
          
          let toolResult;
          try {
            const res = await fetch(`/api/tools/${call.name}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId, ...call.args })
            });
            toolResult = await res.json();
          } catch (err: any) {
            toolResult = { error: err.message };
          }
          
          toolResponses.push({
            functionResponse: {
              name: call.name,
              response: toolResult
            }
          });
        }

        lastResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [...contents, lastResponse.candidates?.[0]?.content as any, { role: 'function', parts: toolResponses }]
        });
        iteration++;
      }

      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: lastResponse.text || '' }],
        activities: currentActivities
      }]);
      setActivities([]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-mimo-bg">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-10">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-12 opacity-30">
            <div className="w-12 h-12 rounded-full border border-mimo-accent flex items-center justify-center mb-6">
              <div className="w-2 h-2 bg-mimo-accent rounded-full animate-pulse" />
            </div>
            <h3 className="font-serif italic text-2xl mb-2">bldr Assistant</h3>
            <p className="text-[10px] font-mono tracking-widest uppercase">Deterministic Control Active</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className="space-y-4">
            <div className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded shrink-0 border transition-colors ${
                m.role === 'user' 
                  ? 'bg-mimo-panel border-mimo-border' 
                  : 'bg-mimo-bg border-mimo-accent flex items-center justify-center'
              }`}>
                {m.role === 'model' && <div className="w-1.5 h-1.5 bg-mimo-accent rounded-full" />}
              </div>
              <div className="space-y-1">
                <div className={`text-[9px] font-mono font-bold uppercase tracking-widest opacity-40 ${m.role === 'user' ? 'text-right' : ''}`}>
                  {m.role === 'user' ? 'User' : 'bldr'}
                </div>
                <div className={`text-sm leading-relaxed ${m.role === 'user' ? 'text-mimo-text-muted text-right' : 'text-mimo-text'}`}>
                  {m.parts[0].text}
                </div>
              </div>
            </div>
            {m.activities && m.activities.length > 0 && (
              <div className="flex justify-start ml-12">
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  {m.activities.map((act, ai) => (
                    <div key={ai} className="bg-mimo-panel border border-mimo-border p-3 rounded space-y-2">
                       <div className="flex items-center justify-between text-[9px] font-mono">
                         <span className="text-mimo-text-muted">EXECUTING TOOL</span>
                         <span className="text-green-500 uppercase">Success</span>
                       </div>
                       <div className="text-[10px] font-mono text-mimo-accent bg-black/40 p-2 rounded truncate">
                         {act.name}({JSON.stringify(act.args)})
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded shrink-0 border border-mimo-accent bg-mimo-bg flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-mimo-accent rounded-full animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-mimo-accent">
                  Thinking...
                </div>
              </div>
            </div>
            {activities.length > 0 && (
              <div className="flex justify-start ml-12">
                <div className="flex flex-col gap-2 w-full max-w-xs">
                  {activities.map((act, ai) => (
                    <div key={ai} className="bg-mimo-panel border border-mimo-accent p-3 rounded space-y-2 animate-pulse">
                       <div className="flex items-center justify-between text-[9px] font-mono">
                         <span className="text-mimo-accent opacity-50 uppercase tracking-widest">Active Tool</span>
                         <Loader2 className="w-3 h-3 animate-spin text-mimo-accent" />
                       </div>
                       <div className="text-[10px] font-mono text-mimo-text bg-black p-2 rounded truncate border border-white/5">
                         {act.name}({JSON.stringify(act.args)})
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-4 px-6 border-t border-mimo-border bg-mimo-bg">
        <div className="flex gap-2 mb-3 items-center overflow-x-auto pb-2 no-scrollbar">
          <button 
            onClick={() => setDryRunEnabled(!dryRunEnabled)}
            className={`px-3 py-1 rounded-full text-[9px] font-mono border transition-all shrink-0 flex items-center gap-2 ${dryRunEnabled ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'border-mimo-border text-mimo-text-muted hover:border-mimo-accent/50'}`}
          >
            <div className={`w-2 h-2 rounded-full ${dryRunEnabled ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
            DRY RUN: {dryRunEnabled ? 'ON' : 'OFF'}
          </button>
          <div className="w-px h-4 bg-mimo-border mx-2 shrink-0" />
          <button 
            onClick={() => setFocusRepoId('all')}
            className={`px-3 py-1 rounded-full text-[9px] font-mono border transition-all shrink-0 ${focusRepoId === 'all' ? 'bg-mimo-accent text-mimo-bg border-mimo-accent' : 'border-mimo-border text-mimo-text-muted hover:border-mimo-accent/50'}`}
          >
            ALL SERVICES
          </button>
          {repos.map(repo => (
            <button 
              key={repo.id}
              onClick={() => setFocusRepoId(repo.id)}
              className={`px-3 py-1 rounded-full text-[9px] font-mono border transition-all shrink-0 ${focusRepoId === repo.id ? 'bg-mimo-accent text-mimo-bg border-mimo-accent font-bold' : 'border-mimo-border text-mimo-text-muted hover:border-mimo-accent/50'}`}
            >
              {repo.name.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="relative flex items-center">
          <input 
            type="text" 
            placeholder="Message bldr..." 
            className="w-full bg-mimo-panel border border-mimo-border rounded-full py-4 px-6 text-sm outline-none focus:border-mimo-accent transition-colors font-sans"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-2 w-10 h-10 bg-mimo-accent text-mimo-bg rounded-full flex items-center justify-center hover:opacity-90 active:scale-90 transition-all disabled:opacity-20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {pendingWrite && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-mimo-panel border border-mimo-border w-full max-w-lg rounded-xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-4 bg-black/40 border-b border-mimo-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-mimo-text">Awaiting Approval — Dry Run</span>
                </div>
                <span className="text-[10px] font-mono text-mimo-text-muted">{pendingWrite.call.name}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-mimo-text-muted uppercase">Target File</label>
                  <div className="bg-black/20 p-2 rounded text-xs font-mono text-mimo-accent border border-mimo-border/50">
                    {pendingWrite.call.args.path}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-mimo-text-muted uppercase">Proposed Changes</label>
                  <pre className="bg-black/40 p-4 rounded text-[10px] font-mono overflow-x-auto border border-white/5 whitespace-pre-wrap leading-relaxed text-mimo-text">
                    {pendingWrite.call.args.content || pendingWrite.call.args.replacement || JSON.stringify(pendingWrite.call.args, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="p-4 bg-black/20 border-t border-mimo-border grid grid-cols-2 gap-4">
                <button 
                  onClick={() => pendingWrite.resolve(false)}
                  className="py-3 px-4 rounded border border-red-500/50 text-red-500 text-xs font-mono uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                >
                  Reject
                </button>
                <button 
                  onClick={() => pendingWrite.resolve(true)}
                  className="py-3 px-4 rounded bg-mimo-accent text-mimo-bg text-xs font-mono font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
                >
                  Approve & Write
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}

function FilesPanel({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      const res = await fetch(`/api/files/${projectId}`);
      const data = await res.json();
      setFiles(data);
    };
    fetchFiles();
  }, [projectId]);

  const handleOpenFile = async (path: string) => {
    setSelectedFile(path);
    setIsLoading(true);
    try {
      const res = await fetch(`/api/files/${projectId}/content?path=${encodeURIComponent(path)}`);
      const text = await res.text();
      setContent(text);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedFile) {
    return (
      <div className="flex flex-col h-full bg-mimo-bg">
        <header className="px-6 h-12 border-b border-mimo-border flex items-center gap-3 shrink-0 bg-mimo-panel">
          <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-white/5 rounded">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-mimo-accent uppercase tracking-widest">{selectedFile.split('/').pop()}</span>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-mimo-accent" />
            </div>
          ) : (
            <pre className="text-xs font-mono whitespace-pre text-mimo-text leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    );
  }

  const groupedFiles = files.reduce((acc: any, file: any) => {
    const repoName = file.repo_name || 'Project Root';
    if (!acc[repoName]) acc[repoName] = [];
    acc[repoName].push(file);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-mimo-bg">
      <div className="px-6 py-4 border-b border-mimo-border flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-mimo-text-muted">Workspace Inventory</span>
        <button 
          onClick={() => {
            const url = prompt('GitHub Repository URL:');
            const name = prompt('Service Name (e.g. auth-api):');
            if (url) {
              fetch('/api/import/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, name, projectId })
              }).then(() => window.location.reload());
            }
          }}
          className="px-3 py-1 bg-mimo-accent text-mimo-bg rounded-full text-[9px] font-bold uppercase tracking-tighter hover:opacity-90 active:scale-95 transition-all"
        >
          Attach Repo
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {files.length === 0 ? (
          <div className="p-12 text-center text-mimo-text-muted font-mono text-xs opacity-50 uppercase">No repositories synced.</div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFiles).map(([repoName, repoFiles]: [string, any]) => (
              <div key={repoName} className="space-y-2">
                <div className="flex items-center gap-2 px-2 opacity-50">
                  <span className="text-xs">📁</span>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-tight">{repoName}</span>
                </div>
                <div className="space-y-1 pl-2 border-l border-mimo-border ml-2">
                  {repoFiles.map((file: any) => (
                    <button
                      key={file.path}
                      onClick={() => handleOpenFile(file.path)}
                      className="w-full px-4 py-2 flex items-center gap-4 hover:bg-white/5 transition-all text-left rounded group"
                    >
                      <span className="text-sm opacity-40 group-hover:text-mimo-accent group-hover:opacity-100 transition-all font-mono">📄</span>
                      <span className="text-xs font-mono text-mimo-text-muted group-hover:text-mimo-text truncate">
                        {file.path.split('/').pop()}
                      </span>
                      <span className="ml-auto text-[9px] font-mono text-mimo-text-muted opacity-30">{(file.size / 1024).toFixed(1)} KB</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewPanel({ projectId }: { projectId: string }) {
  const [key, setKey] = useState(0);

  return (
    <div className="flex flex-col h-full bg-mimo-bg">
      <header className="px-6 h-12 border-b border-mimo-border bg-mimo-panel flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
          </div>
          <div className="text-[10px] font-mono text-mimo-text-muted uppercase tracking-widest">Localhost:3000</div>
        </div>
        <button 
          onClick={() => setKey(k => k + 1)}
          className="p-1.5 hover:bg-white/5 rounded-lg transition-colors"
        >
          <Loader2 className={`w-4 h-4 text-mimo-text-muted ${key > 0 ? 'animate-spin' : ''}`} />
        </button>
      </header>
      <div className="flex-1 bg-white m-6 rounded shadow-[0_35px_60px_-15px_rgba(0,0,0,0.8)] border border-white/5 overflow-hidden relative">
        <iframe 
          key={key}
          src={`/preview/${projectId}/index.html`}
          className="w-full h-full border-none"
          title="Project Preview"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
        <div className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur border border-white/10 rounded px-3 py-2 text-[10px] font-mono text-green-500 shadow-2xl">
          [Preview] Live environment ready
        </div>
      </div>
    </div>
  );
}
