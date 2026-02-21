/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { Edge, Node } from "@xyflow/react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { parseSanitySchema } from "./lib/parseSchema";
import SchemaNode from "~/components/SchemaNode";
import ConnectionModal from "~/components/ConnectionModal";
import Toast from "~/components/Toast";

interface SanityCredentials {
  projectId: string;
  dataset: string;
  token: string;
}

export default function SchemaMind() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rawSchema, setRawSchema] = useState(null);
  const [credentials, setCredentials] = useState<SanityCredentials | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: "error" | "success" | "info" } | null>(null);

  // Track selected nodes for the GROQ generator
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);

  // Chat State
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    {
      role: "assistant",
      text: "Hi! I have loaded your schema. Ask me anything, or **click any two nodes** on the graph to instantly generate a GROQ query connecting them!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const nodeTypes = useMemo(() => ({ schemaNode: SchemaNode }), []);

  // Load credentials from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("sanity-credentials");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that projectId is exactly 8 alphanumeric characters (Sanity format)
        const projectIdRegex = /^[a-zA-Z0-9]{8}$/;
        const datasetRegex = /^[a-z0-9][a-z0-9_-]{0,63}$/;
        if (parsed.projectId && projectIdRegex.test(parsed.projectId) && 
            parsed.dataset && datasetRegex.test(parsed.dataset)) {
          setCredentials(parsed);
          return;
        } else {
          // Bad credentials - clear and show modal
          localStorage.removeItem("sanity-credentials");
          setShowConnectionModal(true);
        }
      } catch (e) {
        console.error("Failed to parse stored credentials");
        setShowConnectionModal(true);
      }
    } else {
      // Show modal if no credentials
      setShowConnectionModal(true);
    }
  }, []);

  // Fetch schema when credentials change
  useEffect(() => {
    if (!credentials) return;

    const fetchSchema = async () => {
      setSchemaLoading(true);
      try {
        // Fetch schema using Sanity's export API
        const exportUrl = `https://${credentials.projectId}.api.sanity.io/v2021-10-21/data/export/${credentials.dataset}`;
        
        const response = await fetch(exportUrl, {
          headers: {
            Authorization: `Bearer ${credentials.token}`,
          },
        });

        console.log("Schema fetch response status:", response);

        if (!response.ok) {
          throw new Error(`Failed to connect (${response.status}). Check your credentials.`);
        }

        // Parse NDJSON (newline-delimited JSON)
        const text = await response.text();
        const lines = text.trim().split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error("Dataset is empty. Please add some documents first.");
        }

        const documents = lines.map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        }).filter(Boolean);

        // Extract unique document types with reference tracking
        const typeMap = new Map();
        const referenceMap = new Map<string, Set<string>>(); // Track field -> target types
        
        // First pass: build type map
        documents.forEach((doc: any) => {
          const typeName = doc._type;
          
          // Skip system types
          if (!typeName || typeName.startsWith('sanity.') || typeName.startsWith('system.')) {
            return;
          }
          
          if (!typeMap.has(typeName)) {
            typeMap.set(typeName, {
              name: typeName,
              type: "document",
              title: typeName.charAt(0).toUpperCase() + typeName.slice(1),
              fields: []
            });
          }
          
          // Analyze fields from document
          const typeInfo = typeMap.get(typeName);
          Object.keys(doc).forEach(key => {
            if (!key.startsWith('_')) {
              const value = doc[key];
              const fieldType = inferFieldType(value);
              
              // Add or update field
              const existingField = typeInfo.fields.find((f: any) => f.name === key);
              if (!existingField) {
                typeInfo.fields.push({ name: key, type: fieldType });
              }
              
              // Track what types are referenced
              if (fieldType === 'reference' && value._ref && value._type) {
                const referencedType = value._type;
                const refKey = `${typeName}.${key}`;
                if (!referenceMap.has(refKey)) {
                  referenceMap.set(refKey, new Set());
                }
                referenceMap.get(refKey)!.add(referencedType);
              }
            }
          });
        });

        // Second pass: add "to" array for reference fields
        typeMap.forEach((typeInfo) => {
          typeInfo.fields.forEach((field: any) => {
            const refKey = `${typeInfo.name}.${field.name}`;
            if (field.type === 'reference' && referenceMap.has(refKey)) {
              const targetTypes = Array.from(referenceMap.get(refKey)!);
              field.to = targetTypes.map((type) => ({ type }));
            }
          });
        });

        const schemaData = Array.from(typeMap.values());

        if (schemaData.length === 0) {
          throw new Error("No document types found. Your dataset may only contain system documents.");
        }

        setRawSchema(schemaData as any);
        const { nodes: initialNodes, edges: initialEdges } =
          parseSanitySchema(schemaData);
        setNodes(initialNodes);
        setEdges(initialEdges);
        
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `✅ Schema loaded! Found ${schemaData.length} document type(s). Ask me anything or click two nodes to generate a GROQ query!`,
          },
        ]);
        // Close modal only on success
        setShowConnectionModal(false);
      } catch (error: any) {
        console.error("Schema fetch error:", error);
        const errorMsg = error.message;
        setShowConnectionModal(false);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `❌ Failed to load schema: ${errorMsg}`,
          },
        ]);
      } finally {
        setSchemaLoading(false);
      }
    };

    fetchSchema();
  }, [credentials, setNodes, setEdges]);

  // Helper function to infer field type from value
  const inferFieldType = (value: any): string => {
    if (value === null || value === undefined) return 'unknown';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'array';
    if (value._ref) return 'reference';
    if (value.asset) return 'image';
    if (typeof value === 'object') return 'object';
    return 'unknown';
  };

  const handleConnect = (newCredentials: SanityCredentials) => {
    setCredentials(newCredentials);
    localStorage.setItem("sanity-credentials", JSON.stringify(newCredentials));
    setMessages([
      {
        role: "assistant",
        text: "✅ Connected! Loading your schema...",
      },
    ]);
  };

  const handleDisconnect = () => {
    setCredentials(null);
    localStorage.removeItem("sanity-credentials");
    setRawSchema(null);
    setNodes([]);
    setEdges([]);
    setMessages([
      {
        role: "assistant",
        text: "Disconnected. Connect your project to get started.",
      },
    ]);
    setShowConnectionModal(true);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const generateDocumentation = async () => {
    if (!rawSchema) return;

    // The instruction we actually send to the AI
    const docPrompt = `
      You are an expert Technical Writer and Content Architect. 
      Read the provided Sanity CMS schema and generate a comprehensive, human-readable documentation wiki for non-technical content editors. 
      
      Requirements:
      1. Explain what each document type is used for.
      2. Clearly explain how they relate to each other without using technical jargon (e.g., say "A Blog Post must be linked to one Author", do NOT say "Post has a reference array to Author").
      3. Use beautiful Markdown formatting with clear H2/H3 headings, bullet points, and bold text for emphasis.
      4. Include a "Best Practices" section at the end for the editors.
      5. Do NOT include any raw JSON or GROQ code in this response.
    `;

    // What the user sees in the chat UI
    const updatedMessages = [
      ...messages,
      {
        role: "user",
        text: "Generate a complete, human-readable Wiki for my content model.",
      },
    ];

    setMessages(updatedMessages);

    // Trigger the AI with the hidden prompt
    await fetchAiResponse(updatedMessages, docPrompt);
  };

  const handleNodeClick = async (_: any, node: { id: any }) => {
    const nodeId = node.id;
    let newSelection = [...selectedNodeIds];

    // Toggle logic: If already selected, remove it. Otherwise, add it.
    if (newSelection.includes(nodeId)) {
      newSelection = newSelection.filter((id) => id !== nodeId);
    } else {
      newSelection.push(nodeId);
    }

    // If 2 nodes are selected, trigger the AI!
    if (newSelection.length === 2) {
      const nodeA = newSelection[0];
      const nodeB = newSelection[1];

      const autoPrompt = `Write a GROQ query to fetch and connect the '${nodeA}' and '${nodeB}' document types based on my schema. Return the GROQ code block and a brief explanation.`;

      const updatedMessages = [
        ...messages,
        { role: "user", text: `Generate GROQ for ${nodeA} -> ${nodeB}` },
      ];
      setMessages(updatedMessages);

      // Clear selection states
      setSelectedNodeIds([]);
      setNodes((nds: any) => nds.map((n: any) => ({ ...n, selected: false })));

      await fetchAiResponse(updatedMessages, autoPrompt);
    } else {
      // If only 1 or 0 nodes are selected, update the state and the visual borders
      setSelectedNodeIds(newSelection);
      setNodes((nds: any) =>
        nds.map((n: any) => ({
          ...n,
          selected: newSelection.includes(n.id),
        })),
      );
    }
  };

  // --- NEW: Explicitly clear the selection ---
  const cancelSelection = () => {
    setSelectedNodeIds([]);
    setNodes((nds: any) => nds.map((n: any) => ({ ...n, selected: false })));
  };

  // Separated the AI fetch logic so both the chat form and node clicks can use it
  const fetchAiResponse = async (
    currentMessages: any[],
    hiddenSystemPrompt?: string,
  ) => {
    setLoading(true);
    try {
      // If triggered by a click, we send the explicit autoPrompt instead of the short chat text
      const messagesToSend = hiddenSystemPrompt
        ? [
            ...currentMessages.slice(0, -1),
            { role: "user", text: hiddenSystemPrompt },
          ]
        : currentMessages;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesToSend, schema: rawSchema }),
      });
      const data = await res.json();

      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I encountered an error." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !rawSchema) return;

    const updatedMessages = [...messages, { role: "user", text: input }];
    setMessages(updatedMessages);
    setInput("");
    await fetchAiResponse(updatedMessages);
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 font-sans text-slate-900">
      {/* Left Side: React Flow Canvas */}
      <div className="flex-grow h-full border-r border-slate-200 relative">
        {" "}
        {/* Helper Badge */}
        {/* UPDATED: Helper Badge with Cancel Button */}
        {selectedNodeIds.length === 1 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-blue-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium animate-bounce">
            <span>Click one more node to generate a query!</span>
            <div className="w-px h-4 bg-blue-400"></div> {/* Divider line */}
            <button
              onClick={cancelSelection}
              className="hover:bg-blue-700 hover:text-red-200 rounded-full px-2 py-1 transition-colors text-xs font-bold"
              title="Cancel selection"
            >
              ✕ Cancel
            </button>
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick} // <-- Attached the click handler!
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.05}
          maxZoom={2}
        >
          <Background color="#cbd5e1" gap={24} size={2} />
          <Controls />
          <MiniMap
            nodeColor="#3b82f6"
            maskColor="rgba(248, 250, 252, 0.7)"
            className="border border-slate-200 rounded-lg shadow-sm"
          />
        </ReactFlow>
      </div>

      {/* Right Side: Chatbot Panel (Remains largely the same, just keeping the map loop clean) */}
      <div className="w-[450px] flex flex-col h-full bg-white shadow-lg">
        {/* Chat Header with Generate Wiki Button and Settings */}
        <div className="p-5 border-b border-slate-100 bg-white">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800">SchemaMind AI</h1>
              <p className="text-sm text-slate-500">
                Your content architecture assistant
              </p>
            </div>

            {/* Settings Icon */}
            <button
              onClick={() => setShowConnectionModal(true)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Connection Settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 text-slate-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* Connection Status */}
          {credentials ? (
            <div className="flex items-center justify-between gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-700 font-medium">
                  Connected to {credentials.projectId}
                </span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-xs text-green-700 hover:text-green-900 underline"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-xs text-amber-700">
                Not connected. Click settings to connect your project.
              </span>
            </div>
          )}

          {/* Generate Wiki Button */}
          <button
            onClick={generateDocumentation}
            disabled={loading || !rawSchema}
            className="flex items-center justify-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md font-bold transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm mt-3 w-full"
            title="Generate a Wiki for editors"
          >
            {/* SVG Document Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            Generate Wiki
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-sm ${msg.role === "user" ? "bg-blue-600 text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none prose prose-sm prose-blue"}`}
              >
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-slate-400 text-sm animate-pulse px-4">
              AI is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your schema..."
              className="flex-grow px-4 py-3 rounded-lg border focus:ring-2 text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-5 py-3 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Connection Modal */}
      <ConnectionModal
        isOpen={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        onConnect={handleConnect}
        currentConnection={
          credentials
            ? { projectId: credentials.projectId, dataset: credentials.dataset }
            : null
        }
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}