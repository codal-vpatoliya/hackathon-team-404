"use client";

import { useState } from "react";

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (credentials: {
    projectId: string;
    dataset: string;
    token: string;
  }) => void;
  currentConnection?: {
    projectId: string;
    dataset: string;
  } | null;
}

export default function ConnectionModal({
  isOpen,
  onClose,
  onConnect,
  currentConnection,
}: ConnectionModalProps) {
  const [projectId, setProjectId] = useState(
    currentConnection?.projectId || ""
  );
  const [dataset, setDataset] = useState(currentConnection?.dataset || "production");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!projectId || !dataset || !token) {
      setError("All fields are required");
      return;
    }

    // Sanity project ID validation - exactly 8 alphanumeric characters
    const projectIdRegex = /^[a-zA-Z0-9]{8}$/;
    if (!projectIdRegex.test(projectId)) {
      setError("Invalid Project ID. Must be exactly 8 alphanumeric characters (e.g., v29st9kr)");
      return;
    }

    // Sanity dataset validation - lowercase, 1-64 chars, start with alphanumeric, only alphanumeric/underscore/hyphen
    const datasetRegex = /^[a-z0-9][a-z0-9_-]{0,63}$/;
    if (!datasetRegex.test(dataset)) {
      setError("Invalid Dataset. Must be lowercase, 1-64 characters, start with alphanumeric, contain only a-z, 0-9, _, -");
      return;
    }

    onConnect({ projectId, dataset, token });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Connect Your Sanity Project
          </h2>
          <p className="text-sm text-slate-600">
            Enter your Sanity project credentials to visualize your schema
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project ID */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Project ID
            </label>
            <input
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="abc123xyz"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Find it in your Sanity dashboard
            </p>
          </div>

          {/* Dataset */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dataset
            </label>
            <input
              type="text"
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              placeholder="production"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* API Token */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              API Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="sk..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-slate-500 mt-1">
              Create a read token in your project API settings
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Connect
            </button>
          </div>
        </form>

        {/* Help text */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-600">
            <strong>Need help?</strong> Get your credentials from{" "}
            <a
              href="https://manage.sanity.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              manage.sanity.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}