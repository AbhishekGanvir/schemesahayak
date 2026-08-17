import React from 'react';

export default function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="fixed bottom-20 right-5 bg-slate-900 text-white text-xs px-3.5 py-2.5 rounded-xl shadow-xl z-50 flex items-center gap-2 border border-slate-700 animate-bounce">
      <i className="fa-solid fa-circle-info text-blue-400"></i>
      <span>{message}</span>
    </div>
  );
}
