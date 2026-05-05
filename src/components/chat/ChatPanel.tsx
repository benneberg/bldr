import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Loader2, 
  Terminal as TerminalIcon, 
  FileText, 
  Search, 
  Plus, 
  Github, 
  ShieldCheck, 
  Zap, 
  X,
  Check,
  AlertCircle,
  Mic,
  GitBranch,
  Info,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Message } from '../../types';
import { callAI, ChatMessage, MiMoTool } from '../../lib/mimo';
import { Provider, ModelTier, PROVIDERS, MODELS, DEFAULT_PROVIDER, DEFAULT_TIER } from '../../lib/providers';

const ai = new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY || '' });

const BLDR_SYSTEM_PROMPT = `You are "bldr", an elite AI IDE assistant specializing in multi-repo architectures.
- Be succinct. Direct action > explanation.
- Use replace_in_file for localized edits (saves tokens).
- Read files before modifying.
- You operate in a workspace; assume paths are relative to root.
- You can manage multiple repositories (microservices) within a single workspace.
- Use run_shell to verify your changes (e.g., npm run lint, npm test).
- Use generate_pr at the end of a task to summarize and especify deployment requirements.`;

interface ChatMessageItemProps {
  m: Message;
  key?: React.Key;
}

function ChatMessageItem({ m }: ChatMessageItemProps) {
  const [showMeta, setShowMeta] = useState(false);

  return (
    <div className="space-y-4">
      <div className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded shrink-0 border transition-colors ${
          m.role === 'user' 
            ? 'bg-mimo-panel border-mimo-border' 
            : 'bg-mimo-bg border-mimo-accent flex items-center justify-center'
        }`}>
          {m.role === 'model' && <div className="w-1.5 h-1.5 bg-mimo-accent rounded-full" />}
        </div>
        <div className="space-y-1 flex-1">
          <div className={`flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-widest opacity-40 ${m.role === 'user' ? 'justify-end' : ''}`}>
            {m.role === 'user' ? 'User' : 'bldr'}
            {m.role === 'model' && m.metadata && (
              <button 
                onClick={() => setShowMeta(!showMeta)}
                className="ml-2 flex items-center gap-1 text-mimo-accent hover:opacity-100 opacity-60 transition-opacity"
              >
                <Activity className="w-3 h-3" />
                {showMeta ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
          
          <AnimatePresence>
            {showMeta && m.metadata && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-2"
              >
                <div className="bg-black/20 rounded p-2 text-[10px] font-mono grid grid-cols-2 gap-x-4 gap-y-1 border border-white/5">
                  <div className="text-mimo-text-muted">Model</div>
                  <div className="text-mimo-text text-right truncate">{m.metadata.model || 'Unknown'}</div>
                  <div className="text-mimo-text-muted">Latency</div>
                  <div className="text-mimo-text text-right">{(m.metadata.latency / 1000).toFixed(2)}s</div>
                  {m.metadata.tokens && (
                    <>
                      <div className="text-mimo-text-muted">Tokens</div>
                      <div className="text-mimo-text text-right">{m.metadata.tokens.total.toLocaleString()}</div>
                      <div className="text-mimo-text-muted opacity-50 pl-2">↳ Prompt</div>
                      <div className="text-mimo-text text-right opacity-50">{m.metadata.tokens.prompt.toLocaleString()}</div>
                      <div className="text-mimo-text-muted opacity-50 pl-2">↳ Completion</div>
                      <div className="text-mimo-text text-right opacity-50">{m.metadata.tokens.completion.toLocaleString()}</div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                   {act.name === 'generate_pr' ? 'DOCUMENTING SESSION CHANGES' : `${act.name}(${JSON.stringify(act.args)})`}
                 </div>
                 {act.name === 'generate_pr' && (
                   <div className="p-4 bg-mimo-bg border-l-2 border-mimo-accent rounded-r space-y-4 shadow-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <GitBranch className="w-4 h-4 text-mimo-accent" />
                        <h4 className="font-serif italic text-lg text-mimo-accent uppercase tracking-tight">Deployment Specification</h4>
                      </div>
                     <p className="text-xs text-mimo-text leading-relaxed font-medium">{act.args.summary}</p>
                     <div className="space-y-2 text-mimo-text">
                       <div className="text-[9px] font-mono text-mimo-text-muted uppercase tracking-widest bg-white/5 p-1 rounded inline-block">Execution Steps</div>
                       <ul className="text-[10px] font-mono space-y-1.5">
                         {act.args.changes.map((c: string, ci: number) => (
                           <li key={ci} className="flex gap-2">
                             <span className="text-mimo-accent text-[8px]">●</span>
                             {c}
                           </li>
                         ))}
                       </ul>
                     </div>
                     {act.args.risks && act.args.risks.length > 0 && (
                       <div className="space-y-2 p-2 bg-red-500/5 border border-red-500/10 rounded">
                         <div className="text-[9px] font-mono text-red-500/60 uppercase">Stability Delta</div>
                         <ul className="text-[10px] font-mono space-y-0.5 text-red-500/80">
                           {act.args.risks.map((r: string, ri: number) => (
                             <li key={ri}>• {r}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                     <button className="w-full py-2 mt-4 bg-mimo-accent/10 border border-mimo-accent/40 text-mimo-accent text-[9px] font-mono uppercase tracking-[0.2em] font-bold hover:bg-mimo-accent hover:text-mimo-bg transition-all">
                       Finalize & Export PR
                     </button>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatPanel({ 
  projectId, 
  messages,
  setMessages,
  planningMode,
  setPlanningMode,
  explanationRequest,
  onExplanated,
  terminalOutput,
  setTerminalOutput
}: { 
  projectId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  planningMode: boolean;
  setPlanningMode: (val: boolean) => void;
  explanationRequest: { path: string; content: string } | null;
  onExplanated: () => void;
  terminalOutput: string[];
  setTerminalOutput: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activities, setActivities] = useState<{name: string, args: any}[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [focusRepoId, setFocusRepoId] = useState<string>('all');
  const [aiProvider, setAiProvider] = useState<Provider | 'gemini'>(DEFAULT_PROVIDER);
  const [aiTier, setAiTier] = useState<ModelTier>(DEFAULT_TIER);
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

    const startTime = Date.now();
    try {
      const contents: any[] = messages.map(m => ({ 
        role: m.role, 
        parts: m.parts 
      }));
      contents.push({ role: 'user', parts: [{ text: textToSend }] });

      let fullContext = '';
      let planningInfo = '';

      if (messages.length === 0) {
        try {
          // Tier 1: CCC Context (Architectural Meta-Data)
          const cccRes = await fetch('/api/ccc/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, term: textToSend, type: 'context' })
          });
          const cccData = await cccRes.json();
          if (cccData && Object.keys(cccData).length > 0) {
            fullContext = `### WORKSPACE ARCHITECTURE\n${JSON.stringify(cccData, null, 2)}\n\n`;
          }

          // Tier 2: Core Guidelines (LLM.md)
          const llmRes = await fetch(`/api/tools/read_file`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, path: 'LLM.md' })
          });
          const llmData = await llmRes.json();
          if (llmData.content) {
            fullContext += `### DEVELOPMENT GUIDELINES\n${llmData.content}\n\n`;
          }

          planningInfo = planningMode ? "\n\nCRITICAL: PLANNING MODE ACTIVE. NO WRITES." : "";

          if (fullContext) {
            contents[0].parts.unshift({ text: `bldr CONTEXT LAYER${planningInfo}:\n\n${fullContext}\n--- GOAL ---` });
          }
        } catch (e) {
          console.error('Context initialization failed:', e);
        }
      }

      const tools = [{
        functionDeclarations: [
          {
            name: 'read_file',
            description: 'Read the content of a file',
            parameters: {
              type: Type.OBJECT,
              properties: { path: { type: Type.STRING, description: 'Path to file relative to workspace root' } },
              required: ['path']
            }
          },
          {
            name: 'write_file',
            description: 'Write or update a file. ALWAYS include the FULL content of the file.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: 'Path to file' },
                content: { type: Type.STRING, description: 'Full file content' }
              },
              required: ['path', 'content']
            }
          },
          {
            name: 'list_files',
            description: 'List all files in the workspace or a specific repository',
            parameters: {
              type: Type.OBJECT,
              properties: { repositoryId: { type: Type.STRING, description: 'Optional: Filter by repository' } }
            }
          },
          {
            name: 'search_files',
            description: 'Search for text across the entire codebase and return file paths with line numbers',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: 'Text to search for' }
              },
              required: ['query']
            }
          },
          {
            name: 'replace_in_file',
            description: 'Find and replace a specific string within a file. Best for targeted edits.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: 'Path to file' },
                find: { type: Type.STRING, description: 'The exact string to find' },
                replace: { type: Type.STRING, description: 'The replacement string' },
                dry_run: { type: Type.BOOLEAN, description: 'Show diff without applying changes' }
              },
              required: ['path', 'find', 'replace']
            }
          },
          {
            name: 'search_code',
            description: 'Search for string or regex patterns across the codebase',
            parameters: {
              type: Type.OBJECT,
              properties: {
                query: { type: Type.STRING, description: 'Search term or regex' },
                isRegex: { type: Type.BOOLEAN, description: 'Whether query is a regex' }
              },
              required: ['query']
            }
          },
          {
            name: 'analyze_dependencies',
            description: 'Analyze imports and dependencies between different files and external packages',
            parameters: { type: Type.OBJECT, properties: {} }
          },
          {
            name: 'get_ccc_status',
            description: 'Check if CCC (Context Compiler) is active and get its current status for the project',
            parameters: { type: Type.OBJECT, properties: {} }
          },
          {
            name: 'run_shell',
            description: 'Execute a shell command in the project directory (e.g. npm run lint, ls -R)',
            parameters: {
              type: Type.OBJECT,
              properties: {
                command: { type: Type.STRING, description: 'The shell command to execute' }
              },
              required: ['command']
            }
          },
          {
            name: 'generate_pr',
            description: 'Generate a structured summary of all changes made in the current session, formatted as a Pull Request description.',
            parameters: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING, description: 'Executive summary' },
                changes: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Bullet points of specific changes' },
                risks: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Potential regressions or areas for testing' }
              },
              required: ['summary', 'changes']
            }
          }
        ]
      }];

      const mimoTools: MiMoTool[] = tools[0].functionDeclarations.map(fd => ({
        type: 'function',
        function: {
          name: fd.name,
          description: fd.description,
          parameters: {
            type: 'object',
            properties: Object.entries(fd.parameters.properties || {}).reduce((acc: any, [k, v]: any) => {
              acc[k] = { type: v.type.toLowerCase(), description: v.description };
              if (v.items) {
                acc[k].items = { type: v.items.type.toLowerCase() };
              }
              return acc;
            }, {}),
            required: fd.parameters.required || []
          }
        }
      }));

      const systemInstruction = `You are "bldr", an elite AI-powered IDE assistant and senior software engineer.
Core Directive: EXECUTE, DO NOT JUST DESCRIBE.
1. bldr is an execution engine. If you need to create, modify, or delete files, you MUST use the provided tools (write_file, replace_in_file, run_shell).
2. DO NOT output code blocks in markdown if you should be writing them to files. 
3. Always provide FULL file content when using write_file. 
4. Reference CCC context (Structured Context) to maintain architectural integrity.
5. If Planning Mode is active, focus on discussion. If it is NOT active, proceed directly to execution.
6. Verify all changes through analysis tools if available.`;

      const genConfig = {
        systemInstruction,
        tools: tools as any
      };

      const currentActivities: any[] = [];
      let finalResponseText = '';
      let metadata: any = { provider: aiProvider, latency: 0 };

      if (aiProvider === 'mimo' || aiProvider === 'openai') {
        // MiMo / OpenAI flow
        const mimoMessages: ChatMessage[] = [
          { role: 'system', content: systemInstruction }
        ];

        // Format contextual messages
        if (messages.length === 0 && fullContext) {
           mimoMessages.push({ role: 'user', content: `bldr SYSTEM CONTEXT (CCC + PKML Mode)${planningInfo}:\n\n${fullContext}\n--- USER GOAL ---\n${textToSend}` });
        } else {
           messages.forEach(m => {
             mimoMessages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text });
           });
           if (messages.length > 0) {
             mimoMessages.push({ role: 'user', content: textToSend });
           }
        }

        let iteration = 0;
        let totalPromptTokens = 0;
        let totalCompletionTokens = 0;

        while (iteration < 10) {
          const response = await callAI({
            provider: aiProvider,
            tier: aiTier,
            messages: mimoMessages,
            tools: mimoTools
          });

          if (response.usage) {
            totalPromptTokens += response.usage.prompt_tokens;
            totalCompletionTokens += response.usage.completion_tokens;
            metadata.tokens = {
              prompt: totalPromptTokens,
              completion: totalCompletionTokens,
              total: totalPromptTokens + totalCompletionTokens
            };
          }
          if (response.model) metadata.model = response.model;

          const choice = response.choices[0];
          const toolCalls = choice.message.tool_calls;

          if (choice.message.content) {
            finalResponseText = choice.message.content;
            mimoMessages.push({ role: 'assistant', content: choice.message.content });
          }

          if (toolCalls && toolCalls.length > 0) {
            const toolResults: any[] = [];
            for (const call of toolCalls) {
              const name = call.function.name;
              const args = JSON.parse(call.function.arguments);

              if ((name === 'write_file' || name === 'replace_in_file') && dryRunEnabled) {
                const approved = await new Promise<boolean>((resolve) => {
                  setPendingWrite({ call: { name, args }, resolve });
                });
                setPendingWrite(null);
                if (!approved) {
                  toolResults.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify({ error: 'Rejected by user' }) });
                  continue;
                }
              }

              const act = { name, args };
              currentActivities.push(act);
              setActivities([...currentActivities]);

              if (name === 'run_shell') setTerminalOutput(prev => [...prev, `> ${args.command}`]);

              let result;
              try {
                const res = await fetch(`/api/tools/${name}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ projectId, ...args })
                });
                result = await res.json();
                if (name === 'run_shell') {
                  if (result.stdout) setTerminalOutput(prev => [...prev, result.stdout]);
                  if (result.stderr) setTerminalOutput(prev => [...prev, `ERROR: ${result.stderr}`]);
                }
              } catch (e: any) {
                result = { error: e.message };
              }

              toolResults.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
            }
            
            // Add messages manually for next iteration as callAI expects ChatMessage
            mimoMessages.push({ role: 'assistant', content: choice.message.content || '', tool_calls: toolCalls } as any);
            toolResults.forEach(tr => mimoMessages.push({ role: 'tool' as any, tool_call_id: tr.tool_call_id, content: tr.content } as any));
            
            iteration++;
          } else {
            break;
          }
        }
      } else {
        // GEMINI FLOW
        let lastResponse = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents,
          config: genConfig
        } as any);

        if (lastResponse.usageMetadata) {
          metadata.tokens = {
            prompt: lastResponse.usageMetadata.promptTokenCount,
            completion: lastResponse.usageMetadata.candidatesTokenCount,
            total: lastResponse.usageMetadata.totalTokenCount
          };
        }
        metadata.model = 'gemini-3-flash-preview';

        let iteration = 0;
        const turnContents = [...contents];

        while (lastResponse.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall) && iteration < 10) {
          const toolResponses: any[] = [];
          const parts = lastResponse.candidates?.[0]?.content?.parts?.filter((p: any) => p.functionCall) || [];
          
          console.log(`[bldr] AI requested ${parts.length} tool calls (Iteration ${iteration + 1})`, parts);

          for (const part of (parts as any[])) {
            const call = part.functionCall;
            if (!call) continue;

            if ((call.name === 'write_file' || call.name === 'replace_in_file') && dryRunEnabled) {
              const approved = await new Promise<boolean>((resolve) => {
                setPendingWrite({ call, resolve });
              });
              setPendingWrite(null);
              if (!approved) {
                toolResponses.push({
                  functionResponse: {
                    name: call.name,
                    response: { error: 'Operation rejected by user (Dry Run active)' }
                  }
                });
                continue;
              }
            }

            const act = { name: call.name, args: call.args };
            currentActivities.push(act);
            setActivities([...currentActivities]);
            
            if (call.name === 'run_shell') {
              const { command } = call.args as any;
              setTerminalOutput(prev => [...prev, `> ${command}`]);
            }

            let toolResult;
            try {
              const res = await fetch(`/api/tools/${call.name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, ...call.args })
              });
              toolResult = await res.json();
              if (call.name === 'run_shell') {
                if (toolResult.stdout) setTerminalOutput(prev => [...prev, toolResult.stdout]);
                if (toolResult.stderr) setTerminalOutput(prev => [...prev, `ERROR: ${toolResult.stderr}`]);
              }
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

          turnContents.push(lastResponse.candidates?.[0]?.content as any);
          turnContents.push({ role: 'function', parts: toolResponses } as any);

          lastResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: turnContents,
            config: genConfig
          } as any);

          if (lastResponse.usageMetadata) {
             metadata.tokens = {
               prompt: lastResponse.usageMetadata.promptTokenCount,
               completion: lastResponse.usageMetadata.candidatesTokenCount,
               total: lastResponse.usageMetadata.totalTokenCount
             };
          }
          iteration++;
        }
        finalResponseText = lastResponse.text || '';
      }

      metadata.latency = Date.now() - startTime;

      setMessages(prev => [...prev, { 
        role: 'model', 
        parts: [{ text: finalResponseText }],
        activities: currentActivities,
        metadata
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-10">
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
          <ChatMessageItem key={i} m={m} />
        ))}


        {activities.length > 0 && (
          <div className="flex flex-col gap-3 ml-12 border-l border-mimo-border pl-6 py-2">
            {activities.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-[10px] font-mono">
                <Loader2 className="w-3 h-3 animate-spin text-mimo-accent" />
                <span className="text-mimo-text animate-pulse">{(a.name || 'UNKNOWN').toUpperCase()}...</span>
              </div>
            ))}
          </div>
        )}
        
        {isTyping && activities.length === 0 && (
          <div className="flex gap-3 ml-12 items-center text-mimo-accent">
            <div className="w-1 h-1 bg-mimo-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1 h-1 bg-mimo-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1 h-1 bg-mimo-accent rounded-full animate-bounce" />
          </div>
        )}

        <AnimatePresence>
          {pendingWrite && (
             <motion.div 
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: 20 }}
               className="bg-mimo-accent/10 border border-mimo-accent rounded-lg p-4 space-y-4"
             >
               <div className="flex items-center gap-3 text-mimo-accent">
                 <ShieldCheck className="w-5 h-5" />
                 <h4 className="font-bold uppercase text-[10px] tracking-widest">Dry Run Interception</h4>
               </div>
               <div className="space-y-1">
                 <p className="text-xs font-mono">Request: {(pendingWrite.call.name || 'UNKNOWN').toUpperCase()} <span className="text-mimo-accent">"{(pendingWrite.call.args as any).path || (pendingWrite.call.args as any).command}"</span></p>
                 <div className="bg-black/50 p-3 rounded font-mono text-[10px] max-h-40 overflow-y-auto">
                   {pendingWrite.call.name === 'write_file' ? (
                     <pre className="whitespace-pre-wrap">{pendingWrite.call.args.content}</pre>
                   ) : (
                     <div className="space-y-2">
                       <div className="text-red-400 border-l border-red-400/50 pl-2 opacity-60">-{pendingWrite.call.args.find}</div>
                       <div className="text-green-400 border-l border-green-400/50 pl-2">+{pendingWrite.call.args.replace}</div>
                     </div>
                   )}
                 </div>
               </div>
               <div className="flex gap-4">
                 <button 
                   onClick={() => pendingWrite.resolve(true)}
                   className="flex-1 py-2 bg-mimo-accent text-mimo-bg rounded font-bold text-[10px] uppercase hover:opacity-90"
                 >
                   Approve Changes
                 </button>
                 <button 
                   onClick={() => pendingWrite.resolve(false)}
                   className="flex-1 py-2 border border-mimo-accent text-mimo-accent rounded font-bold text-[10px] uppercase hover:bg-mimo-accent/10"
                 >
                   Reject
                 </button>
               </div>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 sm:p-6 border-t border-mimo-border bg-mimo-panel space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={() => setPlanningMode(!planningMode)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded flex items-center justify-center gap-2 text-[9px] font-mono uppercase tracking-widest border transition-all ${
                planningMode 
                  ? 'bg-mimo-accent/10 border-mimo-accent text-mimo-accent font-bold' 
                  : 'border-mimo-border text-mimo-text-muted hover:border-mimo-text hover:text-mimo-text'
              }`}
            >
              <Zap className={`w-3 h-3 ${planningMode ? 'animate-pulse' : ''}`} />
              Planning
            </button>
            
            <button 
              onClick={() => setDryRunEnabled(!dryRunEnabled)}
              className={`flex-1 sm:flex-none px-3 py-1.5 rounded flex items-center justify-center gap-2 text-[9px] font-mono uppercase tracking-widest border transition-all ${
                dryRunEnabled 
                  ? 'bg-red-500/10 border-red-500 text-red-500 font-bold' 
                  : 'border-mimo-border text-mimo-text-muted hover:border-mimo-text hover:text-mimo-text'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              DRY RUN: {dryRunEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto sm:ml-auto">
             <div className="flex items-center gap-1.5 flex-1 sm:flex-none">
               <span className="text-[9px] font-mono text-mimo-text-muted uppercase">AI:</span>
               <select 
                 value={aiProvider}
                 onChange={(e) => setAiProvider(e.target.value as any)}
                 className="flex-1 sm:flex-none bg-mimo-bg border border-mimo-border rounded px-2 py-1 text-[9px] font-mono text-mimo-text focus:outline-none focus:border-mimo-accent"
               >
                  <option value="gemini">Gemini</option>
                  <option value="mimo">MiMo</option>
                  <option value="openai">OpenAI</option>
               </select>
             </div>

             {aiProvider !== 'gemini' && (
               <select 
                 value={aiTier}
                 onChange={(e) => setAiTier(e.target.value as any)}
                 className="flex-1 sm:flex-none bg-mimo-bg border border-mimo-border rounded px-2 py-1 text-[9px] font-mono text-mimo-text focus:outline-none focus:border-mimo-accent"
               >
                  <option value="smart">Smart</option>
                  <option value="fast">Fast</option>
                  <option value="cheap">Cheap</option>
               </select>
             )}

             <div className="flex items-center gap-1.5 flex-1 sm:flex-none min-w-0">
               <span className="text-[9px] font-mono text-mimo-text-muted uppercase">REPO:</span>
               <select 
                 value={focusRepoId}
                 onChange={(e) => setFocusRepoId(e.target.value)}
                 className="w-full sm:w-[120px] bg-mimo-bg border border-mimo-border rounded px-2 py-1 text-[9px] font-mono text-mimo-text focus:outline-none focus:border-mimo-accent overflow-hidden text-ellipsis"
               >
                  <option value="all">Full Workspace</option>
                  {repos.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
               </select>
             </div>
          </div>
        </div>

        <div className="relative">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your design goal..."
            className="w-full bg-mimo-bg border border-mimo-border rounded-xl p-4 pr-24 text-sm focus:outline-none focus:border-mimo-accent transition-all resize-none min-h-[100px] text-mimo-text placeholder:text-white/10"
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button 
              onClick={() => alert('Voice input coming in Phase 7 implementation...')}
              className="w-10 h-10 bg-mimo-panel border border-mimo-border text-mimo-text-muted rounded-lg flex items-center justify-center hover:text-mimo-accent hover:border-mimo-accent transition-all"
            >
              <Mic className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-mimo-accent text-mimo-bg rounded-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-30"
            >
              {isTyping ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
