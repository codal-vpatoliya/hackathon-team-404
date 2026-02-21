import React from "react";

interface ToastProps {
  message: string;
  type?: "error" | "success" | "info";
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = "info", onClose }) => {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-medium text-sm transition-all duration-300
        ${type === "error" ? "bg-red-600" : type === "success" ? "bg-green-600" : "bg-blue-600"}`}
      role="alert"
    >
      {message}
      {onClose && (
        <button
          className="ml-4 text-white hover:text-gray-200 font-bold"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
