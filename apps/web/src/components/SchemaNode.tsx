import { Handle, Position } from "@xyflow/react";

interface SchemaNodeProps {
  data: { label: string; fields: { name: string; type: string }[] };
  selected: boolean; // <-- React Flow passes this automatically!
}

export default function SchemaNode({ data, selected }: SchemaNodeProps) {
  return (
    // DO NOT REMOVE min-w-[280px]
    <div
      className={`bg-white rounded-xl shadow-xl border-2 min-w-[280px] overflow-hidden font-sans transition-all duration-200 ${
        selected ? "border-blue-600 shadow-blue-200" : "border-slate-200"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-16 h-1.5 bg-blue-500 rounded-full border-none"
      />

      <div
        className={`px-5 py-3 border-b flex items-center justify-between transition-colors ${
          selected
            ? "bg-blue-50 border-blue-200"
            : "bg-slate-50 border-slate-200"
        }`}
      >
        <h3
          className={`text-lg font-bold tracking-tight ${selected ? "text-blue-800" : "text-slate-800"}`}
        >
          {data.label}
        </h3>
        <span className="text-xs font-semibold text-blue-600 bg-blue-100/50 px-2 py-1 rounded-md">
          Document
        </span>
      </div>

      <div className="p-2 flex flex-col gap-1">
        {data.fields &&
          data.fields.map((field, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center px-3 py-2 text-sm hover:bg-slate-50 rounded-md"
            >
              <span className="font-medium text-slate-700">{field.name}</span>
              <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded-md">
                {field.type}
              </span>
            </div>
          ))}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-16 h-1.5 bg-blue-500 rounded-full border-none"
      />
    </div>
  );
}
