import React from 'react';

export default function SchemeMiniCard({ scheme, onExplore }) {
  return (
    <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs text-slate-800">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{scheme.icon}</span>
        <h4 className="text-xs font-bold text-slate-900">{scheme.name}</h4>
      </div>
      {scheme.summary && <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">{scheme.summary}</p>}
      <div className="flex items-center justify-between gap-2">
        {scheme.benefit && (
          <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-semibold truncate">
            {scheme.benefit.length > 32 ? `${scheme.benefit.substring(0, 32)}...` : scheme.benefit}
          </span>
        )}
        <button
          onClick={() => onExplore(scheme.id)}
          className="text-xs cursor-pointer font-bold text-blue-600 hover:underline flex items-center gap-1 shrink-0 ml-auto"
        >
          Explore Scheme →
        </button>
      </div>
    </div>
  );
}
