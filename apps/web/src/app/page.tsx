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

export default function SchemaMind() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rawSchema, setRawSchema] = useState(null);

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

  const PATH_TO_JSON_SCHEMA = "/api/schema";

  useEffect(() => {
    fetch(PATH_TO_JSON_SCHEMA)
      .then((res) => res.json())
      .then((data) => {
        setRawSchema(data);
        const { nodes: initialNodes, edges: initialEdges } =
          parseSanitySchema(data);
        setNodes(initialNodes);
        setEdges(initialEdges);
      });
  }, [setNodes, setEdges]);

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
        {/* UPDATED: Chat Header with Generate Wiki Button */}
        <div className="p-5 border-b border-slate-100 bg-white flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-800">SchemaMind AI</h1>
            <p className="text-sm text-slate-500">
              Your content architecture assistant
            </p>
          </div>

          <button
            onClick={generateDocumentation}
            disabled={loading || !rawSchema}
            className="flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-md font-bold transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
    </div>
  );
}
