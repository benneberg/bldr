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
  ArrowLeft,
  Info,
  X,
  ChevronDown,
  Folder,
  HelpCircle,
  Code,
  ExternalLink,
  Activity,
  UploadCloud,
  Save,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

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
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [planningMode, setPlanningMode] = useState(false);
  const [explanationRequest, setExplanationRequest] = useState<{ path: string; content: string } | null>(null);

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
          <button 
            onClick={() => setIsInfoOpen(true)}
            className="p-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors text-mimo-text-muted hover:text-mimo-accent"
          >
            <Info className="w-5 h-5" />
          </button>
          <div className="px-2 py-0.5 bg-mimo-bg rounded border border-mimo-border text-[9px] font-mono text-mimo-text-muted">
            SYNCED
          </div>
        </div>
      </header>

      {/* Info Panel Overlay */}
      <AnimatePresence>
        {isInfoOpen && (
          <InfoPanel onClose={() => setIsInfoOpen(false)} />
        )}
      </AnimatePresence>

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
              <ChatPanel 
                projectId={selectedProjectId} 
                planningMode={planningMode} 
                setPlanningMode={setPlanningMode}
                explanationRequest={explanationRequest}
                onExplanated={() => setExplanationRequest(null)}
              />
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
              <FilesPanel 
                projectId={selectedProjectId} 
                onExplain={(req) => {
                  setExplanationRequest(req);
                  setActiveTab('chat');
                }}
              />
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
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsZipping(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name || file.name.replace('.zip', ''));

    try {
      const res = await fetch('/api/import/zip', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.id) {
        window.location.reload();
      }
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-mimo-panel rounded-xl shadow-2xl border border-mimo-border p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-mimo-bg rounded-lg border border-mimo-border flex items-center justify-center">
          <Github className="text-mimo-accent w-6 h-6" />
        </div>
        <div>
          <h3 className="font-serif italic text-lg leading-tight">Project Import</h3>
          <p className="text-[10px] font-mono text-mimo-text-muted uppercase tracking-wider">GitHub or Local ZIP</p>
        </div>
      </div>
      <div className="space-y-4">
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

        <div className="space-y-2 pt-2 border-t border-mimo-border/50">
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-mimo-text-muted ml-2">GITHUB REPOSITORY URL</label>
            <input 
              type="text" 
              placeholder="https://github.com/..." 
              className="w-full px-4 py-3 bg-mimo-bg border border-mimo-border rounded-lg focus:outline-none focus:border-mimo-accent transition-all text-sm font-mono text-mimo-text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button 
            onClick={() => onImport(url, name)}
            disabled={!url || isImporting}
            className="w-full py-4 bg-mimo-accent text-mimo-bg rounded-full font-bold uppercase text-xs tracking-widest hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:grayscale"
          >
            {isImporting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Import from GitHub'}
          </button>
        </div>

        <div className="relative border-t border-mimo-border/50 pt-4 text-center">
           <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-mimo-panel px-2 text-[9px] font-mono text-mimo-text-muted">OR</span>
           <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleZipUpload}
              accept=".zip"
              className="hidden"
           />
           <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isZipping}
              className="w-full py-4 border border-mimo-border rounded-full font-bold uppercase text-[10px] tracking-widest text-mimo-text-muted hover:border-mimo-accent/50 hover:text-mimo-text active:scale-[0.98] transition-all flex items-center justify-center gap-2"
           >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
              {isZipping ? 'Extracting...' : 'Upload PROJECT ZIP'}
           </button>
        </div>
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

function ChatPanel({ 
  projectId, 
  planningMode, 
  setPlanningMode, 
  explanationRequest, 
  onExplanated 
}: { 
  projectId: string;
  planningMode: boolean;
  setPlanningMode: (val: boolean) => void;
  explanationRequest: { path: string; content: string } | null;
  onExplanated: () => void;
}) {
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
    if (explanationRequest) {
      const prompt = `Can you explain the following file: \`${explanationRequest.path}\`?\n\nCode:\n\`\`\`\n${explanationRequest.content}\n\`\`\``;
      handleSend(prompt);
      onExplanated();
    }
  }, [explanationRequest]);

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

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', parts: [{ text: textToSend }] };
    setMessages(prev => [...prev, userMessage]);
    if (!overrideInput) setInput('');
    setIsTyping(true);
    setActivities([]);

    try {
      const contents: any[] = messages.map(m => ({ 
        role: m.role, 
        parts: m.parts 
      }));
      contents.push({ role: 'user', parts: [{ text: textToSend }] });

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

          const planningInfo = planningMode ? "\n\nCRITICAL: PLANNING MODE ACTIVE. DO NOT perform file writes or modifications without explicit request. Focus on architectural discussion and planning." : "";

          if (fullContext) {
            contents[0].parts.unshift({ text: `bldr SYSTEM CONTEXT (CCC + PKML Mode)${planningInfo}:\n\n${fullContext}\n--- USER GOAL ---` });
          } else if (planningMode) {
            contents[0].parts.unshift({ text: `bldr SYSTEM CONTEXT: ${planningInfo}\n--- USER GOAL ---` });
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
            onClick={() => setPlanningMode(!planningMode)}
            className={`px-3 py-1 rounded-full text-[9px] font-mono border transition-all shrink-0 flex items-center gap-2 ${planningMode ? 'bg-mimo-accent/20 text-mimo-accent border-mimo-accent/50' : 'border-mimo-border text-mimo-text-muted hover:border-mimo-accent/50'}`}
          >
            <Activity className="w-3 h-3" />
            PLANNING: {planningMode ? 'ON' : 'OFF'}
          </button>
          <div className="w-px h-4 bg-mimo-border mx-1 shrink-0" />
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

function FilesPanel({ projectId, onExplain }: { projectId: string, onExplain: (req: { path: string; content: string }) => void }) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const fetchFiles = async () => {
      const res = await fetch(`/api/files/${projectId}`);
      const data = await res.json();
      setFiles(data);
    };
    fetchFiles();
  }, [projectId]);

  useEffect(() => {
    if (content !== null) {
      setEditedContent(content);
      setHasUnsavedChanges(false);
    }
  }, [content]);

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

  const handleSave = async () => {
    if (!selectedFile || isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/tools/write_file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, path: selectedFile, content: editedContent })
      });
      if (res.ok) {
        setContent(editedContent);
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const tree = buildTree(files);

  if (selectedFile) {
    return (
      <div className="flex flex-col h-full bg-mimo-bg">
        <header className="px-6 h-12 border-b border-mimo-border flex items-center justify-between shrink-0 bg-mimo-panel sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-white/5 rounded text-mimo-accent">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-mimo-accent uppercase tracking-widest truncate max-w-[120px]">{selectedFile.split('/').pop()}</span>
            {hasUnsavedChanges && <div className="w-1.5 h-1.5 rounded-full bg-mimo-accent animate-pulse" />}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`px-3 py-1 flex items-center gap-2 rounded-full text-[9px] font-mono transition-all border ${
                hasUnsavedChanges 
                  ? 'bg-mimo-accent text-mimo-bg border-mimo-accent hover:opacity-90' 
                  : 'bg-white/5 border-mimo-border text-mimo-text-muted opacity-50 cursor-not-allowed'
              }`}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : hasUnsavedChanges ? <Save className="w-3 h-3" /> : <Check className="w-3 h-3" />}
              {isSaving ? 'SAVING...' : hasUnsavedChanges ? 'SAVE CHANGES' : 'SAVED'}
            </button>
            <button 
              onClick={() => onExplain({ path: selectedFile, content: editedContent || '' })}
              className="px-3 py-1 bg-white/5 border border-mimo-border hover:border-mimo-accent hover:text-mimo-accent rounded-full text-[9px] font-mono transition-all flex items-center gap-2"
            >
              <HelpCircle className="w-3 h-3" />
              AI EXPLAIN
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-[#282c34]">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="animate-spin text-mimo-accent" />
            </div>
          ) : (
            <CodeMirror
              value={editedContent}
              height="100%"
              theme={oneDark}
              extensions={[javascript({ jsx: true, typescript: true })]}
              onChange={(value) => {
                setEditedContent(value);
                setHasUnsavedChanges(value !== content);
              }}
              basicSetup={{
                lineNumbers: true,
                highlightActiveLine: true,
                bracketMatching: true,
                closeBrackets: true,
                autocompletion: true,
                foldGutter: true,
              }}
              className="text-[11px] sm:text-xs h-full"
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-mimo-bg">
      <div className="px-6 py-4 border-b border-mimo-border flex items-center justify-between bg-mimo-panel shrink-0">
        <div className="flex items-center gap-2">
          <FolderCode className="w-3 h-3 text-mimo-accent" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-mimo-text-muted">Workspace Inventory</span>
        </div>
        <button 
          onClick={() => {
            const url = prompt('GitHub Repository URL:');
            const name = prompt('Service Name (e.g. auth-api):');
            if (url && name) {
              fetch('/api/import/github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, name, projectId })
              }).then(() => window.location.reload());
            }
          }}
          className="px-3 py-1 bg-mimo-accent text-mimo-bg rounded-full text-[9px] font-bold uppercase tracking-tighter hover:opacity-90 active:scale-95 transition-all shadow-[0_4px_10px_rgba(242,125,38,0.2)]"
        >
          Attach Repo
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {files.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-center px-12">
            <p className="text-mimo-text-muted font-mono text-[10px] opacity-50 uppercase tracking-widest">No repositories synced. Use the button above to import your first service.</p>
          </div>
        ) : (
          <div className="space-y-1">
             <FileTree nodes={tree.children || {}} onSelect={handleOpenFile} level={0} />
          </div>
        )}
      </div>
    </div>
  );
}

interface TreeNode {
  name: string;
  path: string;
  size?: number;
  children?: Record<string, TreeNode>;
}

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: 'root', path: '', children: {} };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, i) => {
      if (!current.children) current.children = {};
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          children: i < parts.length - 1 ? {} : undefined,
          size: i === parts.length - 1 ? file.size : undefined
        };
      }
      current = current.children[part];
    });
  });
  
  return root;
}

function FileTree({ nodes, onSelect, level }: { nodes: Record<string, TreeNode>, onSelect: (path: string) => void, level: number }) {
  return (
    <>
      {Object.values(nodes).sort((a, b) => {
        // Folders first
        if (a.children && !b.children) return -1;
        if (!a.children && b.children) return 1;
        return a.name.localeCompare(b.name);
      }).map(node => (
        <FileTreeNode key={node.path} node={node} onSelect={onSelect} level={level} />
      ))}
    </>
  );
}

interface FileTreeNodeProps {
  node: TreeNode;
  onSelect: (path: string) => void;
  level: number;
  key?: string;
}

function FileTreeNode({ node, onSelect, level }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(level === 0); // Open top level by default
  const isFolder = !!node.children;

  return (
    <div className="select-none">
      <button
        onClick={() => {
          if (isFolder) setIsOpen(!isOpen);
          else onSelect(node.path);
        }}
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-all group ${
          isFolder ? 'hover:bg-white/5' : 'hover:bg-mimo-accent/10'
        }`}
        style={{ paddingLeft: `${(level + 1) * 12}px` }}
      >
        <span className="shrink-0 flex items-center justify-center w-4">
          {isFolder ? (
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
              <ChevronRight className={`w-3.5 h-3.5 ${isOpen ? 'text-mimo-accent' : 'text-mimo-text-muted opacity-50'}`} />
            </motion.div>
          ) : (
            <div className="w-1 h-1 bg-mimo-accent/30 rounded-full group-hover:bg-mimo-accent transition-colors" />
          )}
        </span>
        {isFolder ? <Folder className="w-3.5 h-3.5 text-mimo-accent/80" /> : <FileText className="w-3.5 h-3.5 text-mimo-text-muted opacity-40 group-hover:text-mimo-accent group-hover:opacity-100 transition-all" />}
        <span className={`text-[11px] font-mono truncate transition-colors ${
          isFolder ? 'text-mimo-text font-bold' : 'text-mimo-text-muted group-hover:text-mimo-text'
        }`}>
          {node.name}
        </span>
        {!isFolder && node.size && (
          <span className="ml-auto text-[8px] font-mono text-mimo-text-muted opacity-0 group-hover:opacity-40 transition-opacity whitespace-nowrap">
            {(node.size / 1024).toFixed(1)} KB
          </span>
        )}
      </button>
      {isFolder && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-l border-mimo-border/30 ml-2.5"
            >
              <FileTree nodes={node.children || {}} onSelect={onSelect} level={level + 1} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function InfoPanel({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'about' | 'guide' | 'faq'>('about');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-mimo-panel border border-mimo-border w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="p-4 px-6 border-b border-mimo-border flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded bg-mimo-accent/10 border border-mimo-accent/20 flex items-center justify-center">
               <HelpCircle className="w-4 h-4 text-mimo-accent" />
             </div>
             <span className="text-xs font-mono font-bold uppercase tracking-widest">Project Info</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-mimo-text-muted" />
          </button>
        </div>

        <div className="flex border-b border-mimo-border bg-black/10">
          <button 
            onClick={() => setActiveTab('about')}
            className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${activeTab === 'about' ? 'text-mimo-accent bg-white/5 shadow-[inset_0_-2px_0_var(--color-mimo-accent)]' : 'text-mimo-text-muted hover:text-mimo-text'}`}
          >
            What is bldr
          </button>
          <button 
            onClick={() => setActiveTab('guide')}
            className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${activeTab === 'guide' ? 'text-mimo-accent bg-white/5 shadow-[inset_0_-2px_0_var(--color-mimo-accent)]' : 'text-mimo-text-muted hover:text-mimo-text'}`}
          >
            User Guide
          </button>
          <button 
            onClick={() => setActiveTab('faq')}
            className={`flex-1 py-3 text-[10px] font-mono font-bold uppercase tracking-widest transition-all ${activeTab === 'faq' ? 'text-mimo-accent bg-white/5 shadow-[inset_0_-2px_0_var(--color-mimo-accent)]' : 'text-mimo-text-muted hover:text-mimo-text'}`}
          >
            FAQ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'about' && (
              <motion.div 
                key="about" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <h2 className="font-serif italic text-2xl text-mimo-accent leading-tight">Build Anywhere, Intelligently.</h2>
                <p className="text-sm text-mimo-text-muted leading-relaxed">
                  bldr is a mobile-optimized development sandbox designed for high-density code iteration. It bridges the gap between fragmented mobile interfaces and complex multi-repo architectures.
                </p>
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-white/5 border border-mimo-border p-3 rounded-lg flex flex-col gap-2">
                     <Code className="w-4 h-4 text-mimo-accent" />
                     <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Multi-Repo</span>
                     <span className="text-[9px] text-mimo-text-muted opacity-60">Manage complex services as one workspace.</span>
                   </div>
                   <div className="bg-white/5 border border-mimo-border p-3 rounded-lg flex flex-col gap-2">
                     <Activity className="w-4 h-4 text-mimo-accent" />
                     <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Heuristic AI</span>
                     <span className="text-[9px] text-mimo-text-muted opacity-60">Deterministic tool usage for reliable changes.</span>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'guide' && (
              <motion.div 
                key="guide" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div className="space-y-6">
                  <GuideItem step="1" title="Create Workspace" description="Start by giving your project a unique ID. This creates a persistent SQLite sandbox." />
                  <GuideItem step="2" title="Attach Repositories" description="Use the 'Attach Repo' button in the Files tab to pull in code from GitHub. You can attach multiple services." />
                  <GuideItem step="3" title="Chat to Code" description="The AI contextually understands your whole tree. Ask it to 'add a login route in the auth-api' and it will cross-reference dependencies." />
                  <GuideItem step="4" title="Live Preview" description="Check the Preview tab to see your changes reflected instantly in the isolated sandbox." />
                </div>
              </motion.div>
            )}

            {activeTab === 'faq' && (
              <motion.div 
                key="faq" 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="space-y-2"
              >
                <FAQItem question="How many repos can I connect?" answer="You can connect as many as your disk quota allows. bldr organizes them in nested directories for clean AI vision." />
                <FAQItem question="Is the AI deterministic?" answer="Yes. We use strict tool definitions (CCC patterns) to ensure the AI follows your architectural rules and product requirements." />
                <FAQItem question="Can I edit files manually?" answer="Not currently in the mobile view, but you can use the AI assistant to perform precise line-by-line replacements." />
                <FAQItem question="What is Dry Run mode?" answer="When enabled, the assistant must show you a diff of any proposed file changes before they are committed to disk." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-black/40 border-t border-mimo-border flex items-center justify-between">
          <span className="text-[9px] font-mono text-mimo-text-muted opacity-40">v1.2.0-beta ● PROD</span>
          <a href="https://github.com/bldr-workspace" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase text-mimo-accent hover:underline">
            <Github className="w-3 h-3" />
            Source
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GuideItem({ step, title, description }: { step: string, title: string, description: string }) {
  return (
    <div className="flex gap-4">
      <div className="w-6 h-6 rounded-full bg-mimo-accent text-mimo-bg flex items-center justify-center text-[10px] font-bold shrink-0 shadow-[0_0_15px_rgba(242,125,38,0.3)]">
        {step}
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-bold font-mono uppercase tracking-widest text-mimo-text">{title}</h4>
        <p className="text-[11px] text-mimo-text-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-mimo-border/50 rounded-lg overflow-hidden transition-colors hover:border-mimo-accent/30">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-white/2"
      >
        <span className="text-xs font-bold text-mimo-text leading-tight">{question}</span>
        <ChevronDown className={`w-4 h-4 text-mimo-accent transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 text-[11px] text-mimo-text-muted leading-relaxed border-t border-white/5 mt-1">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
